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

// Storage keys
const STORAGE_KEYS = {
  SITES: 'jammin_sites',
  SETTINGS: 'jammin_settings',
};

const FORM_DRAFT_KEY = 'jammin_site_form_draft';

// Form field IDs for draft saving
const FORM_FIELDS = [
  'site-name-input',
  'site-pattern',
  'site-title-pattern',
  'site-path',
  'site-instructions',
  'site-selectors',
] as const;

interface FormDraft {
  'site-name-input': string;
  'site-pattern': string;
  'site-title-pattern': string;
  'site-path': string;
  'site-instructions': string;
  'site-selectors': string;
}

// State
let sites: SiteConfig[] = [];
let settings: ExtensionSettings = { ...DEFAULT_SETTINGS };
let editingSiteId: string | null = null;

// DOM Elements
const siteListEl = document.getElementById('site-list')!;
const addSiteBtn = document.getElementById('add-site')!;
const siteModal = document.getElementById('site-modal')!;
const siteForm = document.getElementById('site-form') as HTMLFormElement;
const modalTitle = document.getElementById('modal-title')!;
const cancelModalBtn = document.getElementById('cancel-modal')!;
const deleteSiteBtn = document.getElementById('delete-site')!;

// Settings elements
const bridgeUrlInput = document.getElementById('bridge-url') as HTMLInputElement;
const claudePathInput = document.getElementById('claude-path') as HTMLInputElement;
const defaultEditorSelect = document.getElementById('default-editor') as HTMLSelectElement;

// Load data
async function loadData(): Promise<void> {
  const result = await chrome.storage.sync.get([STORAGE_KEYS.SITES, STORAGE_KEYS.SETTINGS]);
  sites = result[STORAGE_KEYS.SITES] || [];
  settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEYS.SETTINGS] };

  renderSites();
  renderSettings();
}

// Save sites
async function saveSites(): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SITES]: sites });
}

// Save settings
async function saveSettings(): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_KEYS.SETTINGS]: settings });
}

// Save form draft to localStorage
function saveFormDraft(): void {
  const draft: FormDraft = {
    'site-name-input': (document.getElementById('site-name-input') as HTMLInputElement).value,
    'site-pattern': (document.getElementById('site-pattern') as HTMLInputElement).value,
    'site-title-pattern': (document.getElementById('site-title-pattern') as HTMLInputElement).value,
    'site-path': (document.getElementById('site-path') as HTMLInputElement).value,
    'site-instructions': (document.getElementById('site-instructions') as HTMLTextAreaElement).value,
    'site-selectors': (document.getElementById('site-selectors') as HTMLTextAreaElement).value,
  };
  localStorage.setItem(FORM_DRAFT_KEY, JSON.stringify(draft));
}

// Load form draft from localStorage
function loadFormDraft(): FormDraft | null {
  const saved = localStorage.getItem(FORM_DRAFT_KEY);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as FormDraft;
  } catch {
    return null;
  }
}

// Clear form draft from localStorage
function clearFormDraft(): void {
  localStorage.removeItem(FORM_DRAFT_KEY);
}

// Restore form from draft
function restoreFormFromDraft(draft: FormDraft): void {
  (document.getElementById('site-name-input') as HTMLInputElement).value = draft['site-name-input'] || '';
  (document.getElementById('site-pattern') as HTMLInputElement).value = draft['site-pattern'] || '';
  (document.getElementById('site-title-pattern') as HTMLInputElement).value = draft['site-title-pattern'] || '';
  (document.getElementById('site-path') as HTMLInputElement).value = draft['site-path'] || '';
  (document.getElementById('site-instructions') as HTMLTextAreaElement).value = draft['site-instructions'] || '';
  (document.getElementById('site-selectors') as HTMLTextAreaElement).value = draft['site-selectors'] || DEFAULT_EDITABLE_SELECTORS.join('\n');
}

// Render site list
function renderSites(): void {
  if (sites.length === 0) {
    siteListEl.innerHTML = `
      <div class="empty-state">
        <p>No sites configured yet.</p>
        <p>Click "Add Site" to get started.</p>
      </div>
    `;
    return;
  }

  siteListEl.innerHTML = sites
    .map(
      (site) => `
      <div class="site-card" data-id="${site.id}">
        <div class="site-header">
          <div class="site-info">
            <div class="site-name">${escapeHtml(site.name)}</div>
            <div class="site-url">${escapeHtml(site.urlPattern)}${site.titlePattern ? ` · title: ${escapeHtml(site.titlePattern)}` : ''}</div>
          </div>
          <label class="toggle">
            <input type="checkbox" ${site.enabled ? 'checked' : ''} data-toggle="${site.id}">
            <span class="toggle-slider"></span>
          </label>
        </div>
        <div class="site-path">${escapeHtml(site.localPath)}</div>
        <button class="btn-edit" data-edit="${site.id}">Edit</button>
      </div>
    `
    )
    .join('');

  // Add event listeners
  siteListEl.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('change', (e) => {
      const id = (e.target as HTMLElement).dataset.toggle!;
      const site = sites.find((s) => s.id === id);
      if (site) {
        site.enabled = (e.target as HTMLInputElement).checked;
        saveSites();
      }
    });
  });

  siteListEl.querySelectorAll('[data-edit]').forEach((el) => {
    el.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).dataset.edit!;
      openEditModal(id);
    });
  });
}

// Render settings
function renderSettings(): void {
  bridgeUrlInput.value = settings.bridgeUrl;
  claudePathInput.value = settings.claudePath || 'claude';
  defaultEditorSelect.value = settings.defaultEditor;
}

// Open add modal
function openAddModal(): void {
  editingSiteId = null;
  modalTitle.textContent = 'Add Site';
  deleteSiteBtn.style.display = 'none';

  // Check for saved draft
  const draft = loadFormDraft();
  if (draft) {
    restoreFormFromDraft(draft);
  } else {
    // Reset form with defaults
    siteForm.reset();
    (document.getElementById('site-selectors') as HTMLTextAreaElement).value =
      DEFAULT_EDITABLE_SELECTORS.join('\n');
  }

  siteModal.classList.add('open');
}

// Open edit modal
function openEditModal(id: string): void {
  const site = sites.find((s) => s.id === id);
  if (!site) return;

  editingSiteId = id;
  modalTitle.textContent = 'Edit Site';
  deleteSiteBtn.style.display = 'block';

  // Clear any draft when editing existing site
  clearFormDraft();

  // Fill form
  (document.getElementById('site-name-input') as HTMLInputElement).value = site.name;
  (document.getElementById('site-pattern') as HTMLInputElement).value = site.urlPattern;
  (document.getElementById('site-title-pattern') as HTMLInputElement).value = site.titlePattern || '';
  (document.getElementById('site-path') as HTMLInputElement).value = site.localPath;
  (document.getElementById('site-instructions') as HTMLTextAreaElement).value =
    site.customInstructions || '';
  (document.getElementById('site-selectors') as HTMLTextAreaElement).value =
    site.editableSelectors.join('\n');

  siteModal.classList.add('open');
}

// Close modal
function closeModal(): void {
  siteModal.classList.remove('open');
  editingSiteId = null;
}

// Cancel and close modal
function cancelModal(): void {
  clearFormDraft();
  closeModal();
}

// Save site from form
function saveSiteFromForm(): void {
  const name = (document.getElementById('site-name-input') as HTMLInputElement).value.trim();
  const urlPattern = (document.getElementById('site-pattern') as HTMLInputElement).value.trim();
  const titlePattern = (document.getElementById('site-title-pattern') as HTMLInputElement).value.trim();
  const localPath = (document.getElementById('site-path') as HTMLInputElement).value.trim();
  const customInstructions = (
    document.getElementById('site-instructions') as HTMLTextAreaElement
  ).value.trim();
  const selectorsText = (
    document.getElementById('site-selectors') as HTMLTextAreaElement
  ).value.trim();

  if (!name || !urlPattern || !localPath) {
    alert('Please fill in all required fields.');
    return;
  }

  const editableSelectors = selectorsText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s);

  if (editingSiteId) {
    // Update existing
    const site = sites.find((s) => s.id === editingSiteId);
    if (site) {
      site.name = name;
      site.urlPattern = urlPattern;
      site.titlePattern = titlePattern || undefined;
      site.localPath = localPath;
      site.customInstructions = customInstructions;
      site.editableSelectors = editableSelectors.length > 0 ? editableSelectors : [...DEFAULT_EDITABLE_SELECTORS];
    }
  } else {
    // Create new
    sites.push({
      id: crypto.randomUUID(),
      name,
      urlPattern,
      titlePattern: titlePattern || undefined,
      localPath,
      customInstructions,
      editableSelectors: editableSelectors.length > 0 ? editableSelectors : [...DEFAULT_EDITABLE_SELECTORS],
      enabled: true,
    });
  }

  // Clear draft on successful save
  clearFormDraft();

  saveSites();
  renderSites();
  closeModal();
}

// Delete site
function deleteSite(): void {
  if (!editingSiteId) return;

  if (confirm('Are you sure you want to delete this site?')) {
    sites = sites.filter((s) => s.id !== editingSiteId);
    clearFormDraft();
    saveSites();
    renderSites();
    closeModal();
  }
}

// Helper: escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Event listeners
addSiteBtn.addEventListener('click', openAddModal);
cancelModalBtn.addEventListener('click', cancelModal);
deleteSiteBtn.addEventListener('click', deleteSite);

siteForm.addEventListener('submit', (e) => {
  e.preventDefault();
  saveSiteFromForm();
});

// Save draft on input for Add Site modal only
FORM_FIELDS.forEach((fieldId) => {
  const field = document.getElementById(fieldId);
  field?.addEventListener('input', () => {
    // Only save draft when adding a new site, not editing
    if (editingSiteId === null && siteModal.classList.contains('open')) {
      saveFormDraft();
    }
  });
});

// NO backdrop click to close - user must use Cancel or Save buttons

// Settings change handlers
bridgeUrlInput.addEventListener('change', () => {
  settings.bridgeUrl = bridgeUrlInput.value.trim() || DEFAULT_SETTINGS.bridgeUrl;
  saveSettings();
});

claudePathInput.addEventListener('change', () => {
  settings.claudePath = claudePathInput.value.trim() || DEFAULT_SETTINGS.claudePath;
  saveSettings();
});

defaultEditorSelect.addEventListener('change', () => {
  settings.defaultEditor = defaultEditorSelect.value as 'cursor' | 'code' | 'auto';
  saveSettings();
});

// Initialize
loadData();
