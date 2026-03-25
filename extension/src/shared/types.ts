// Site configuration stored in Chrome sync storage
export interface SiteConfig {
  id: string;
  name: string;
  urlPattern: string; // Glob pattern, e.g., "https://example.com/*"
  titlePattern?: string; // Glob pattern matched against page title, e.g., "*Jammin Games*"
  localPath: string; // Local file path, e.g., "~/Code/my-website"
  customInstructions?: string;
  editableSelectors: string[]; // CSS selectors for editable regions
  enabled: boolean;
}

// Global extension settings
export interface ExtensionSettings {
  bridgeUrl: string;
  claudePath: string;
  defaultEditor: 'cursor' | 'code' | 'auto';
  showStatusPanel: boolean;
  autoSave: boolean;
}

// Edit change structure
export interface EditChange {
  elementPath: string; // Human-readable path like "article.blog-post > section > p"
  selector: string; // CSS selector for targeting
  originalContent: string;
  newContent: string;
}

// Tracked element state
export interface TrackedElement {
  element: HTMLElement;
  originalContent: string;
  selector: string;
  elementPath: string;
  isDirty: boolean;
}

// Message types from extension to bridge
export interface PingMessage {
  type: 'ping';
}

export interface SubmitEditMessage {
  type: 'submit_edit';
  jobId: string;
  projectPath: string;
  siteUrl: string;
  changes: EditChange[];
  customInstructions?: string;
  claudePath?: string;
  skipGitCheck?: boolean;
}

export interface CancelJobMessage {
  type: 'cancel_job';
  jobId: string;
}

export interface OpenEditorMessage {
  type: 'open_editor';
  projectPath: string;
  file?: string;
}

export type ExtensionToBridgeMessage =
  | PingMessage
  | SubmitEditMessage
  | CancelJobMessage
  | OpenEditorMessage;

// Message types from bridge to extension
export interface PongMessage {
  type: 'pong';
  version: string;
  claudeAvailable: boolean;
}

export interface JobAcceptedMessage {
  type: 'job_accepted';
  jobId: string;
}

export interface JobProgressMessage {
  type: 'job_progress';
  jobId: string;
  output: string;
  phase: 'thinking' | 'editing' | 'complete';
}

export interface JobCompleteMessage {
  type: 'job_complete';
  jobId: string;
  success: boolean;
  filesChanged?: string[];
  error?: string;
}

export interface JobCancelledMessage {
  type: 'job_cancelled';
  jobId: string;
}

export interface BridgeErrorMessage {
  type: 'error';
  message: string;
  code: string;
}

export interface GitDirtyMessage {
  type: 'git_dirty';
  jobId: string;
  changedFiles: string[];
}

export type BridgeToExtensionMessage =
  | PongMessage
  | JobAcceptedMessage
  | JobProgressMessage
  | JobCompleteMessage
  | JobCancelledMessage
  | BridgeErrorMessage
  | GitDirtyMessage;

// Internal message passing between content script and background
export interface ContentToBackgroundMessage {
  action:
    | 'get_site_config'
    | 'submit_changes'
    | 'submit_changes_force'
    | 'cancel_job'
    | 'open_editor'
    | 'get_connection_status'
    | 'get_job_status'
    | 'activate_cms'
    | 'get_cms_status';
  payload?: unknown;
}

export interface BackgroundToContentMessage {
  action:
    | 'site_config'
    | 'job_accepted'
    | 'job_progress'
    | 'job_complete'
    | 'job_cancelled'
    | 'connection_status'
    | 'git_dirty'
    | 'cms_status'
    | 'activate_cms'
    | 'error';
  payload?: unknown;
}

// Connection status
export interface ConnectionStatus {
  connected: boolean;
  bridgeVersion?: string;
  claudeAvailable?: boolean;
  error?: string;
}

// Job status tracked by content script
export interface JobStatus {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'error' | 'cancelled';
  output: string;
  phase: 'thinking' | 'editing' | 'complete';
  filesChanged?: string[];
  error?: string;
}

