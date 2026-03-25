import type {
  ContentToBackgroundMessage,
  BackgroundToContentMessage,
  EditChange,
  BridgeToExtensionMessage,
  ExtensionSettings,
} from '../shared/types';
import { getSiteConfigs, matchSiteConfig, getSettings } from './config';
import { bridgeConnection } from './websocket';

// Track which tabs are listening for job updates
const tabJobSubscriptions = new Map<number, Set<string>>();

// Handle messages from content scripts
chrome.runtime.onMessage.addListener(
  (
    message: ContentToBackgroundMessage,
    sender,
    sendResponse: (response: BackgroundToContentMessage) => void
  ) => {
    const tabId = sender.tab?.id;

    console.log(`[Jammin] Content → bg: ${message.action} (tab ${tabId ?? '?'})`);
    handleMessage(message, tabId).then((response) => {
      console.log(`[Jammin] Bg → content: ${response.action} (tab ${tabId ?? '?'})`);
      sendResponse(response);
    }).catch((err) => {
      console.error('[Jammin] Error handling message:', message.action, err);
      sendResponse({
        action: 'error',
        payload: { message: err instanceof Error ? err.message : 'Unknown error' },
      });
    });

    // Return true to indicate async response
    return true;
  }
);

async function handleMessage(
  message: ContentToBackgroundMessage,
  tabId?: number
): Promise<BackgroundToContentMessage> {
  switch (message.action) {
    case 'get_site_config': {
      const { url, title } = message.payload as { url: string; title?: string };
      const sites = await getSiteConfigs();
      const config = matchSiteConfig(url, sites, title);
      return {
        action: 'site_config',
        payload: config || null,
      };
    }

    case 'submit_changes':
    case 'submit_changes_force': {
      const { projectPath, siteUrl, changes, customInstructions } = message.payload as {
        projectPath: string;
        siteUrl: string;
        changes: EditChange[];
        customInstructions?: string;
      };

      const jobId = crypto.randomUUID();
      const settings = await getSettings();
      const skipGitCheck = message.action === 'submit_changes_force';

      // Subscribe tab to job updates
      if (tabId) {
        if (!tabJobSubscriptions.has(tabId)) {
          tabJobSubscriptions.set(tabId, new Set());
        }
        tabJobSubscriptions.get(tabId)!.add(jobId);
      }

      // Submit to bridge
      bridgeConnection.send({
        type: 'submit_edit',
        jobId,
        projectPath,
        siteUrl,
        changes,
        customInstructions,
        claudePath: settings.claudePath,
        skipGitCheck,
      });

      return {
        action: 'job_accepted',
        payload: { jobId },
      };
    }

    case 'cancel_job': {
      const { jobId } = message.payload as { jobId: string };
      bridgeConnection.send({
        type: 'cancel_job',
        jobId,
      });
      return {
        action: 'job_cancelled',
        payload: { jobId },
      };
    }

    case 'open_editor': {
      const { projectPath, file } = message.payload as {
        projectPath: string;
        file?: string;
      };
      bridgeConnection.send({
        type: 'open_editor',
        projectPath,
        file,
      });
      return {
        action: 'job_accepted',
        payload: {},
      };
    }

    case 'get_connection_status': {
      return {
        action: 'connection_status',
        payload: bridgeConnection.getStatus(),
      };
    }

    case 'get_job_status': {
      const { jobId } = message.payload as { jobId: string };
      return {
        action: 'job_progress',
        payload: bridgeConnection.getJobStatus(jobId),
      };
    }

    default:
      throw new Error(`Unknown action: ${(message as { action: string }).action}`);
  }
}

// Forward bridge messages to subscribed tabs
bridgeConnection.addMessageHandler((message: BridgeToExtensionMessage) => {
  if (!('jobId' in message) || !message.jobId) return;

  const jobId = message.jobId;
  const shortId = jobId.slice(0, 8);

  // Find tabs subscribed to this job
  let foundSubscriber = false;
  for (const [tabId, jobs] of tabJobSubscriptions) {
    if (jobs.has(jobId)) {
      foundSubscriber = true;
      let action: BackgroundToContentMessage['action'];
      switch (message.type) {
        case 'job_progress':
          action = 'job_progress';
          break;
        case 'job_complete':
          action = 'job_complete';
          // Remove subscription when job completes
          jobs.delete(jobId);
          break;
        case 'job_cancelled':
          action = 'job_cancelled';
          jobs.delete(jobId);
          break;
        case 'git_dirty':
          action = 'git_dirty';
          // Keep subscription - user may confirm and retry
          break;
        default:
          return;
      }

      console.log(`[Jammin] Forwarding ${message.type} (job ${shortId}) → tab ${tabId}`);
      chrome.tabs.sendMessage(tabId, {
        action,
        payload: message,
      } as BackgroundToContentMessage);
    }
  }

  if (!foundSubscriber) {
    console.warn(`[Jammin] No tab subscribed to job ${shortId} for ${message.type}`);
  }
});

// Clean up subscriptions when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  tabJobSubscriptions.delete(tabId);
});

console.log('[Jammin] Background service worker initialized');
