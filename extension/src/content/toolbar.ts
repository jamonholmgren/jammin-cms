import type { SiteConfig, JobProgressMessage, JobCompleteMessage } from '../shared/types';
import { getStyles } from './styles';

export interface ToolbarCallbacks {
  onSave: () => void;
  onRevert: () => void;
  onToggleEdit: (enabled: boolean) => void;
  onOpenEditor: () => void;
}

export class Toolbar {
  private container: HTMLElement | null = null;
  private shadowRoot: ShadowRoot | null = null;
  private expanded = false;
  private outputExpanded = false;
  private editEnabled = false;
  private dirtyCount = 0;
  private saving = false;
  private config: SiteConfig | null = null;
  private callbacks: ToolbarCallbacks | null = null;

  // Status panel state
  private output = '';
  private phase: 'idle' | 'thinking' | 'editing' | 'complete' = 'idle';
  private filesChanged: string[] = [];
  private error: string | null = null;

  public create(config: SiteConfig, callbacks: ToolbarCallbacks): void {
    if (this.container) return;

    this.config = config;
    this.callbacks = callbacks;

    // Create container with shadow DOM for style isolation
    this.container = document.createElement('div');
    this.container.id = 'jammin-toolbar-container';
    this.shadowRoot = this.container.attachShadow({ mode: 'closed' });

    // Add styles
    const style = document.createElement('style');
    style.textContent = getStyles();
    this.shadowRoot.appendChild(style);

    // Create toolbar content
    const toolbar = document.createElement('div');
    toolbar.className = 'jammin-toolbar';
    toolbar.innerHTML = this.getToolbarHTML();
    this.shadowRoot.appendChild(toolbar);

    // Add to page
    document.body.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();

    // Start collapsed
    this.setExpanded(false);
  }

  public destroy(): void {
    if (this.container) {
      this.container.remove();
      this.container = null;
      this.shadowRoot = null;
    }
  }

  private getToolbarHTML(): string {
    return `
      <button class="jammin-toggle" title="Jammin CMS">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
          <path d="M2 2l7.586 7.586"></path>
          <circle cx="11" cy="11" r="2"></circle>
        </svg>
        <span class="jammin-badge" style="display: none;">0</span>
      </button>
      <div class="jammin-panel-wrapper">
        <div class="jammin-output-drawer">
          <div class="jammin-output-header">
            <div class="jammin-output-title">
              <span class="jammin-status-indicator"></span>
              <span class="jammin-status-phase">Ready</span>
            </div>
            <button class="jammin-output-close" title="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="jammin-output-body">
            <pre class="jammin-output-content"></pre>
          </div>
          <div class="jammin-output-footer"></div>
        </div>
        <div class="jammin-panel">
          <div class="jammin-header">
            <span class="jammin-title">${this.config?.name || 'Jammin CMS'}</span>
            <button class="jammin-close" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="jammin-content">
            <div class="jammin-row">
              <label class="jammin-switch">
                <input type="checkbox" id="jammin-edit-toggle">
                <span class="jammin-slider"></span>
              </label>
              <span>Enable editing</span>
            </div>
            <div class="jammin-actions">
              <button class="jammin-btn jammin-btn-primary" id="jammin-save" disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>
              <button class="jammin-btn" id="jammin-revert" disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>Revert</span>
              </button>
            </div>
            <div class="jammin-divider"></div>
            <div class="jammin-actions">
              <button class="jammin-btn" id="jammin-editor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Open Editor</span>
              </button>
              <button class="jammin-btn" id="jammin-output-toggle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                </svg>
                <span>Output</span>
              </button>
            </div>
            <div class="jammin-status-text">
              <span id="jammin-status-message">Ready</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private setupEventListeners(): void {
    if (!this.shadowRoot) return;

    // Toggle button
    const toggle = this.shadowRoot.querySelector('.jammin-toggle');
    toggle?.addEventListener('click', () => this.setExpanded(!this.expanded));

    // Close button
    const close = this.shadowRoot.querySelector('.jammin-close');
    close?.addEventListener('click', () => this.setExpanded(false));

    // Edit toggle
    const editToggle = this.shadowRoot.querySelector('#jammin-edit-toggle') as HTMLInputElement;
    editToggle?.addEventListener('change', () => {
      this.editEnabled = editToggle.checked;
      this.callbacks?.onToggleEdit(this.editEnabled);
      this.updateUI();
    });

    // Save button
    const saveBtn = this.shadowRoot.querySelector('#jammin-save');
    saveBtn?.addEventListener('click', () => {
      if (!this.saving && this.dirtyCount > 0) {
        this.callbacks?.onSave();
      }
    });

    // Revert button
    const revertBtn = this.shadowRoot.querySelector('#jammin-revert');
    revertBtn?.addEventListener('click', () => {
      if (this.dirtyCount > 0) {
        this.callbacks?.onRevert();
      }
    });

    // Open editor button
    const editorBtn = this.shadowRoot.querySelector('#jammin-editor');
    editorBtn?.addEventListener('click', () => {
      this.callbacks?.onOpenEditor();
    });

    // Output toggle button
    const outputToggle = this.shadowRoot.querySelector('#jammin-output-toggle');
    outputToggle?.addEventListener('click', () => {
      this.setOutputExpanded(!this.outputExpanded);
    });

    // Output close button
    const outputClose = this.shadowRoot.querySelector('.jammin-output-close');
    outputClose?.addEventListener('click', () => {
      this.setOutputExpanded(false);
    });
  }

  private setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    const wrapper = this.shadowRoot?.querySelector('.jammin-panel-wrapper');
    const toggle = this.shadowRoot?.querySelector('.jammin-toggle');

    if (expanded) {
      wrapper?.classList.add('expanded');
      toggle?.classList.add('hidden');
    } else {
      wrapper?.classList.remove('expanded');
      toggle?.classList.remove('hidden');
      // Also close output drawer when main panel closes
      this.setOutputExpanded(false);
    }
  }

  private setOutputExpanded(expanded: boolean): void {
    this.outputExpanded = expanded;
    const drawer = this.shadowRoot?.querySelector('.jammin-output-drawer');
    if (expanded) {
      drawer?.classList.add('expanded');
    } else {
      drawer?.classList.remove('expanded');
    }
  }

  public updateDirtyCount(count: number): void {
    this.dirtyCount = count;
    this.updateUI();
  }

  public setSaving(saving: boolean): void {
    this.saving = saving;
    this.updateUI();
  }

  public setStatus(message: string): void {
    const statusEl = this.shadowRoot?.querySelector('#jammin-status-message');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  private updateUI(): void {
    if (!this.shadowRoot) return;

    // Update badge
    const badge = this.shadowRoot.querySelector('.jammin-badge') as HTMLElement;
    if (badge) {
      badge.style.display = this.dirtyCount > 0 ? 'flex' : 'none';
      badge.textContent = String(this.dirtyCount);
    }

    // Update save button
    const saveBtn = this.shadowRoot.querySelector('#jammin-save') as HTMLButtonElement;
    if (saveBtn) {
      saveBtn.disabled = this.dirtyCount === 0 || this.saving;
      const span = saveBtn.querySelector('span');
      if (span) {
        span.textContent = this.saving ? 'Saving...' : 'Save';
      }
    }

    // Update revert button
    const revertBtn = this.shadowRoot.querySelector('#jammin-revert') as HTMLButtonElement;
    if (revertBtn) {
      revertBtn.disabled = this.dirtyCount === 0 || this.saving;
    }

    // Update edit toggle state
    const editToggle = this.shadowRoot.querySelector('#jammin-edit-toggle') as HTMLInputElement;
    if (editToggle && editToggle.checked !== this.editEnabled) {
      editToggle.checked = this.editEnabled;
    }

    // Update output panel
    this.updateOutputUI();
  }

  private updateOutputUI(): void {
    if (!this.shadowRoot) return;

    // Update phase indicator
    const indicator = this.shadowRoot.querySelector('.jammin-status-indicator');
    const phaseEl = this.shadowRoot.querySelector('.jammin-status-phase');

    if (indicator) {
      indicator.className = 'jammin-status-indicator';
      if (this.phase !== 'idle') {
        indicator.classList.add(`phase-${this.phase}`);
      }
      if (this.error) {
        indicator.classList.add('phase-error');
      }
    }

    if (phaseEl) {
      if (this.error) {
        phaseEl.textContent = 'Error';
      } else {
        switch (this.phase) {
          case 'idle':
            phaseEl.textContent = 'Ready';
            break;
          case 'thinking':
            phaseEl.textContent = 'Thinking...';
            break;
          case 'editing':
            phaseEl.textContent = 'Editing files...';
            break;
          case 'complete':
            phaseEl.textContent = 'Complete';
            break;
        }
      }
    }

    // Update output content
    const outputEl = this.shadowRoot.querySelector('.jammin-output-content');
    if (outputEl) {
      const cleanOutput = this.output
        .replace(/\x1b\[[0-9;]*m/g, '')
        .replace(/\r/g, '');
      outputEl.textContent = cleanOutput || 'Waiting for output...';
    }

    // Update footer with files changed
    const footerEl = this.shadowRoot.querySelector('.jammin-output-footer');
    if (footerEl) {
      if (this.filesChanged.length > 0) {
        footerEl.innerHTML = `
          <div class="jammin-files-header">Files modified:</div>
          <ul class="jammin-files-list">
            ${this.filesChanged.map((f) => `<li>${this.escapeHtml(f)}</li>`).join('')}
          </ul>
        `;
      } else if (this.error) {
        footerEl.innerHTML = `<div class="jammin-error">${this.escapeHtml(this.error)}</div>`;
      } else {
        footerEl.innerHTML = '';
      }
    }

    // Auto-scroll output
    const outputBody = this.shadowRoot.querySelector('.jammin-output-body');
    if (outputBody) {
      outputBody.scrollTop = outputBody.scrollHeight;
    }
  }

  public setEditEnabled(enabled: boolean): void {
    this.editEnabled = enabled;
    this.updateUI();
  }

  // Status panel methods integrated into toolbar
  public resetOutput(): void {
    this.output = '';
    this.phase = 'thinking';
    this.filesChanged = [];
    this.error = null;
    this.updateOutputUI();
  }

  public addProgress(message: JobProgressMessage): void {
    this.output += message.output;
    this.phase = message.phase;
    this.updateOutputUI();
  }

  public setComplete(message: JobCompleteMessage): void {
    this.phase = 'complete';
    this.filesChanged = message.filesChanged || [];
    this.error = message.error || null;
    this.updateOutputUI();
  }

  public showOutput(): void {
    this.setOutputExpanded(true);
  }

  public hideOutput(): void {
    this.setOutputExpanded(false);
  }

  public toggleOutput(): void {
    this.setOutputExpanded(!this.outputExpanded);
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
