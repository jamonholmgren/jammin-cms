import type {
  SiteConfig,
  ContentToBackgroundMessage,
  BackgroundToContentMessage,
  JobProgressMessage,
  JobCompleteMessage,
  GitDirtyMessage,
} from '../shared/types';
import { InlineEditor } from './editor';
import { Toolbar } from './toolbar';
import { getPageStyles } from './styles';

class JamminCMS {
  private config: SiteConfig | null = null;
  private editor: InlineEditor | null = null;
  private toolbar: Toolbar | null = null;
  private currentJobId: string | null = null;
  private styleElement: HTMLStyleElement | null = null;
  private activated = false;
  private pendingChanges: {
    projectPath: string;
    siteUrl: string;
    changes: Array<{ elementPath: string; selector: string; originalContent: string; newContent: string }>;
    customInstructions?: string;
  } | null = null;

  constructor() {
    // Listen for activation messages from popup
    chrome.runtime.onMessage.addListener((message: BackgroundToContentMessage, sender, sendResponse) => {
      if (message.action === 'activate_cms') {
        this.activate().then(() => {
          sendResponse({ success: true, activated: this.activated });
        });
        return true; // Async response
      }
      if (message.action === 'cms_status') {
        sendResponse({ activated: this.activated });
        return false;
      }
      // Handle other messages if activated
      if (this.activated) {
        this.handleBackgroundMessage(message);
      }
      return false;
    });
  }

  async activate(): Promise<void> {
    if (this.activated) return;

    console.log('[Jammin] Activating — checking config for:', window.location.href, '| title:', document.title);
    const config = await this.getConfigForCurrentPage();
    if (!config) {
      console.log('[Jammin] No matching config for this page');
      return;
    }

    this.config = config;
    this.activated = true;
    console.log('[Jammin] Activated for:', config.name, '| path:', config.localPath);

    // Create components
    this.editor = new InlineEditor();
    this.toolbar = new Toolbar();

    // Inject page styles
    this.injectPageStyles();

    // Initialize components
    this.editor.setConfig(config);
    this.editor.setDirtyChangeHandler(() => {
      this.toolbar?.updateDirtyCount(this.editor?.getDirtyCount() || 0);
    });

    this.toolbar.create(config, {
      onSave: () => this.handleSave(),
      onRevert: () => this.handleRevert(),
      onToggleEdit: (enabled) => this.handleToggleEdit(enabled),
      onOpenEditor: () => this.handleOpenEditor(),
    });

    // Listen for keyboard shortcuts
    document.addEventListener('jammin:save', () => this.handleSave());
  }

  private async getConfigForCurrentPage(): Promise<SiteConfig | null> {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'get_site_config',
          payload: { url: window.location.href, title: document.title },
        } as ContentToBackgroundMessage,
        (response: BackgroundToContentMessage) => {
          resolve(response?.payload as SiteConfig | null);
        }
      );
    });
  }

  private injectPageStyles(): void {
    this.styleElement = document.createElement('style');
    this.styleElement.id = 'jammin-page-styles';
    this.styleElement.textContent = getPageStyles();
    document.head.appendChild(this.styleElement);
  }

  private handleToggleEdit(enabled: boolean): void {
    if (!this.editor || !this.toolbar) return;

    if (enabled) {
      this.editor.enable();
      document.body.classList.add('jammin-editing-active');
    } else {
      this.editor.disable();
      document.body.classList.remove('jammin-editing-active');
    }
    this.toolbar.setEditEnabled(enabled);
  }

  private async handleSave(): Promise<void> {
    if (!this.config || !this.editor || !this.toolbar) return;
    if (!this.editor.hasDirtyElements()) return;

    const changes = this.editor.getDirtyChanges();
    if (changes.length === 0) return;

    console.log(`[Jammin] Saving ${changes.length} change(s) to ${this.config.localPath}`);
    this.toolbar.setSaving(true);
    this.toolbar.setStatus('Checking project...');
    this.toolbar.resetOutput();
    this.toolbar.showOutput();

    // Store pending changes in case of git dirty warning
    this.pendingChanges = {
      projectPath: this.config.localPath,
      siteUrl: window.location.href,
      changes,
      customInstructions: this.config.customInstructions,
    };

    // Submit changes to background
    chrome.runtime.sendMessage(
      {
        action: 'submit_changes',
        payload: this.pendingChanges,
      } as ContentToBackgroundMessage,
      (response: BackgroundToContentMessage) => {
        if (response?.action === 'job_accepted') {
          this.currentJobId = (response.payload as { jobId: string }).jobId;
          console.log(`[Jammin] Job accepted: ${this.currentJobId.slice(0, 8)}`);
          this.toolbar?.setStatus('Claude is working...');
        } else if (response?.action === 'error') {
          console.error('[Jammin] Submit error:', (response.payload as { message: string }).message);
          this.toolbar?.setSaving(false);
          this.toolbar?.setStatus('Error: ' + (response.payload as { message: string }).message);
          this.pendingChanges = null;
        } else {
          console.warn('[Jammin] Unexpected submit response:', response);
        }
      }
    );
  }

  private handleRevert(): void {
    if (!this.editor || !this.toolbar) return;
    this.editor.revertAll();
    this.toolbar.setStatus('Changes reverted');
  }

  private handleOpenEditor(): void {
    if (!this.config) return;

    chrome.runtime.sendMessage({
      action: 'open_editor',
      payload: { projectPath: this.config.localPath },
    } as ContentToBackgroundMessage);
  }

  private handleBackgroundMessage(message: BackgroundToContentMessage): void {
    if (!this.toolbar || !this.editor) {
      console.warn('[Jammin] Received message but toolbar/editor not ready:', message.action);
      return;
    }

    switch (message.action) {
      case 'job_progress': {
        const progress = message.payload as JobProgressMessage;
        if (progress.jobId === this.currentJobId) {
          this.toolbar.addProgress(progress);
          this.toolbar.setStatus(
            progress.phase === 'editing' ? 'Editing files...' : 'Claude is thinking...'
          );
        } else {
          console.warn(`[Jammin] Progress for unknown job ${progress.jobId?.slice(0, 8)}, current: ${this.currentJobId?.slice(0, 8)}`);
        }
        break;
      }

      case 'job_complete': {
        const complete = message.payload as JobCompleteMessage;
        if (complete.jobId === this.currentJobId) {
          console.log(`[Jammin] Job complete: success=${complete.success}, files=${complete.filesChanged?.length ?? 0}`);
          this.toolbar.setComplete(complete);
          this.toolbar.setSaving(false);

          if (complete.success) {
            this.editor.markSaved();
            const fileCount = complete.filesChanged?.length || 0;
            this.toolbar.setStatus(
              `Done! ${fileCount} file${fileCount !== 1 ? 's' : ''} modified`
            );
          } else {
            this.toolbar.setStatus('Error: ' + (complete.error || 'Unknown error'));
          }

          this.currentJobId = null;
        }
        break;
      }

      case 'job_cancelled': {
        const cancelled = message.payload as { jobId: string };
        if (cancelled.jobId === this.currentJobId) {
          this.toolbar.setSaving(false);
          this.toolbar.setStatus('Cancelled');
          this.currentJobId = null;
        }
        break;
      }

      case 'git_dirty': {
        const gitDirty = message.payload as GitDirtyMessage;
        if (gitDirty.jobId === this.currentJobId) {
          this.handleGitDirty(gitDirty);
        }
        break;
      }

      case 'error': {
        console.error('[Jammin] Error from background:', (message.payload as { message: string }).message);
        this.toolbar.setSaving(false);
        this.toolbar.setStatus('Error: ' + (message.payload as { message: string }).message);
        break;
      }

      default:
        console.log('[Jammin] Unhandled message:', message.action);
    }
  }

  private handleGitDirty(gitDirty: GitDirtyMessage): void {
    if (!this.toolbar) return;

    const fileCount = gitDirty.changedFiles.length;
    const fileList = gitDirty.changedFiles.slice(0, 5).join('\n  ');
    const moreFiles = fileCount > 5 ? `\n  ... and ${fileCount - 5} more` : '';

    const confirmed = confirm(
      `This project has ${fileCount} uncommitted change${fileCount !== 1 ? 's' : ''}:\n  ${fileList}${moreFiles}\n\nDo you want to proceed anyway?`
    );

    if (confirmed && this.pendingChanges) {
      // Resubmit with skipGitCheck
      chrome.runtime.sendMessage(
        {
          action: 'submit_changes_force',
          payload: this.pendingChanges,
        } as ContentToBackgroundMessage,
        (response: BackgroundToContentMessage) => {
          if (response?.action === 'job_accepted') {
            this.currentJobId = (response.payload as { jobId: string }).jobId;
            this.toolbar?.setStatus('Claude is working...');
          } else if (response?.action === 'error') {
            this.toolbar?.setSaving(false);
            this.toolbar?.setStatus('Error: ' + (response.payload as { message: string }).message);
          }
        }
      );
    } else {
      this.toolbar.setSaving(false);
      this.toolbar.setStatus('Cancelled - uncommitted changes');
      this.currentJobId = null;
    }
    this.pendingChanges = null;
  }
}

// Create instance - it will wait for activation message
new JamminCMS();
