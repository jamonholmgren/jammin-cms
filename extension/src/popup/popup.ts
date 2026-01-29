import type { ConnectionStatus, SiteConfig } from '../shared/types';

// Get connection status from background
async function getConnectionStatus(): Promise<ConnectionStatus> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: 'get_connection_status' },
      (response) => {
        resolve(response?.payload || { connected: false });
      }
    );
  });
}

// Get current tab's config
async function getCurrentTabConfig(): Promise<SiteConfig | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return null;

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      {
        action: 'get_site_config',
        payload: { url: tab.url },
      },
      (response) => {
        resolve(response?.payload || null);
      }
    );
  });
}

// Check if CMS is activated on current tab
async function getCmsStatus(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return false;

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, { action: 'cms_status' }, (response) => {
      // If no response (content script not loaded), return false
      if (chrome.runtime.lastError || !response) {
        resolve(false);
        return;
      }
      resolve(response?.activated || false);
    });
  });
}

// Activate CMS on current tab
async function activateCms(): Promise<boolean> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return false;

  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id!, { action: 'activate_cms' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        resolve(false);
        return;
      }
      resolve(response?.activated || false);
    });
  });
}

// Update UI
async function updateUI(): Promise<void> {
  const statusEl = document.getElementById('connection-status')!;
  const statusDotEl = document.getElementById('status-dot')!;
  const siteInfoEl = document.getElementById('site-info')!;
  const siteNameEl = document.getElementById('site-name')!;
  const siteStatusEl = document.getElementById('site-status')!;
  const noSiteEl = document.getElementById('no-site')!;
  const activateBtn = document.getElementById('activate-btn')!;

  // Check connection
  const status = await getConnectionStatus();

  if (status.connected) {
    statusEl.textContent = `Connected (v${status.bridgeVersion || '?'})`;
    statusDotEl.className = 'status-dot connected';

    if (!status.claudeAvailable) {
      statusEl.textContent += ' - Claude CLI not found';
      statusDotEl.className = 'status-dot warning';
    }
  } else {
    statusEl.textContent = status.error || 'Disconnected';
    statusDotEl.className = 'status-dot disconnected';
  }

  // Check current site
  const config = await getCurrentTabConfig();

  if (config) {
    siteInfoEl.style.display = 'block';
    noSiteEl.style.display = 'none';
    siteNameEl.textContent = config.name;

    // Check if already activated
    const isActivated = await getCmsStatus();

    if (isActivated) {
      siteStatusEl.textContent = 'Active';
      siteStatusEl.className = 'site-status active';
      activateBtn.textContent = 'Activated';
      activateBtn.classList.add('activated');
      (activateBtn as HTMLButtonElement).disabled = true;
    } else {
      siteStatusEl.textContent = 'Inactive';
      siteStatusEl.className = 'site-status';
      activateBtn.textContent = 'Activate Editing';
      activateBtn.classList.remove('activated');
      (activateBtn as HTMLButtonElement).disabled = false;
    }
  } else {
    siteInfoEl.style.display = 'none';
    noSiteEl.style.display = 'block';
  }
}

// Open options page
function openOptions(): void {
  chrome.runtime.openOptionsPage();
}

// Handle activate button click
async function handleActivate(): Promise<void> {
  const activateBtn = document.getElementById('activate-btn')!;
  activateBtn.textContent = 'Activating...';
  (activateBtn as HTMLButtonElement).disabled = true;

  const success = await activateCms();

  if (success) {
    await updateUI();
    // Close popup after short delay
    setTimeout(() => window.close(), 500);
  } else {
    activateBtn.textContent = 'Activate Editing';
    (activateBtn as HTMLButtonElement).disabled = false;
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateUI();

  // Options button
  document.getElementById('open-options')?.addEventListener('click', openOptions);
  document.getElementById('configure-site')?.addEventListener('click', openOptions);

  // Activate button
  document.getElementById('activate-btn')?.addEventListener('click', handleActivate);

  // Refresh status every 5 seconds
  setInterval(updateUI, 5000);
});
