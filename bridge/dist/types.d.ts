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
export type ExtensionMessage = PingMessage | SubmitEditMessage | CancelJobMessage | OpenEditorMessage;
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
export interface ErrorMessage {
    type: 'error';
    message: string;
    code: string;
}
export interface GitDirtyMessage {
    type: 'git_dirty';
    jobId: string;
    changedFiles: string[];
}
export type BridgeMessage = PongMessage | JobAcceptedMessage | JobProgressMessage | JobCompleteMessage | JobCancelledMessage | ErrorMessage | GitDirtyMessage;
export interface EditChange {
    elementPath: string;
    selector: string;
    originalContent: string;
    newContent: string;
}
export interface Job {
    id: string;
    projectPath: string;
    siteUrl: string;
    changes: EditChange[];
    customInstructions?: string;
    claudePath?: string;
    status: 'pending' | 'running' | 'complete' | 'cancelled' | 'error';
    process?: import('child_process').ChildProcess;
    output: string;
    filesChanged: string[];
}
//# sourceMappingURL=types.d.ts.map