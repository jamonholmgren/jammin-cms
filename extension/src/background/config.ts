import type { SiteConfig, ExtensionSettings } from '../shared/types';

// Inlined to avoid shared chunk in bundle
const DEFAULT_SETTINGS: ExtensionSettings = {
  bridgeUrl: 'ws://localhost:9876',
  claudePath: 'claude',
  defaultEditor: 'auto',
  showStatusPanel: true,
  autoSave: false,
};

const DEFAULT_EDITABLE_SELECTORS = ['main', 'article', '[role="main"]'];

const STORAGE_KEYS = {
  SITES: 'jammin_sites',
  SETTINGS: 'jammin_settings',
} as const;

// Get all site configurations
export async function getSiteConfigs(): Promise<SiteConfig[]> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SITES);
  return result[STORAGE_KEYS.SITES] || [];
}

// Save all site configurations
export async function saveSiteConfigs(sites: SiteConfig[]): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SITES]: sites });
}

// Get a single site config by ID
export async function getSiteConfig(id: string): Promise<SiteConfig | undefined> {
  const sites = await getSiteConfigs();
  return sites.find((s) => s.id === id);
}

// Add or update a site config
export async function upsertSiteConfig(site: SiteConfig): Promise<void> {
  const sites = await getSiteConfigs();
  const index = sites.findIndex((s) => s.id === site.id);
  if (index >= 0) {
    sites[index] = site;
  } else {
    sites.push(site);
  }
  await saveSiteConfigs(sites);
}

// Delete a site config
export async function deleteSiteConfig(id: string): Promise<void> {
  const sites = await getSiteConfigs();
  await saveSiteConfigs(sites.filter((s) => s.id !== id));
}

// Find matching site config for a URL and/or page title
export function matchSiteConfig(url: string, sites: SiteConfig[], title?: string): SiteConfig | undefined {
  for (const site of sites) {
    if (!site.enabled) continue;
    if (matchUrlPattern(url, site.urlPattern)) return site;
    if (title && site.titlePattern && matchGlobPattern(title, site.titlePattern)) return site;
  }
  return undefined;
}

function matchGlobPattern(value: string, pattern: string): boolean {
  // Convert glob pattern to regex
  // * matches anything except /
  // ** matches anything including /
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*\*/g, '.*') // ** matches anything
    .replace(/\*/g, '[^/]*'); // * matches non-slash chars

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(value);
}

function matchUrlPattern(url: string, pattern: string): boolean {
  return matchGlobPattern(url, pattern);
}

// Get extension settings
export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };
}

// Save extension settings
export async function saveSettings(settings: Partial<ExtensionSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.sync.set({
    [STORAGE_KEYS.SETTINGS]: { ...current, ...settings },
  });
}

// Create a new site config with defaults
export function createSiteConfig(
  name: string,
  urlPattern: string,
  localPath: string
): SiteConfig {
  return {
    id: crypto.randomUUID(),
    name,
    urlPattern,
    localPath,
    customInstructions: '',
    editableSelectors: [...DEFAULT_EDITABLE_SELECTORS],
    enabled: true,
  };
}
