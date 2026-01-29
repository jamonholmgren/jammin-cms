import type { Job } from './types.js';
interface ClaudeCallbacks {
    onProgress: (output: string, phase: 'thinking' | 'editing' | 'complete') => void;
    onComplete: (success: boolean, filesChanged?: string[], error?: string) => void;
}
export declare function checkClaudeAvailable(): Promise<boolean>;
export declare function checkGitDirty(projectPath: string): {
    isDirty: boolean;
    changedFiles: string[];
};
export declare function spawnClaudeJob(job: Job, callbacks: ClaudeCallbacks): Promise<void>;
export declare function cancelJob(job: Job): void;
export {};
//# sourceMappingURL=claude.d.ts.map