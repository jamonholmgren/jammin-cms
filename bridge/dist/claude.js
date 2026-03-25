import { spawn, execSync } from 'child_process';
import { buildPrompt } from './prompt.js';
// Check if Claude CLI is available
export async function checkClaudeAvailable() {
    try {
        execSync('which claude', { stdio: 'pipe' });
        return true;
    }
    catch {
        return false;
    }
}
// Check if git repo has uncommitted changes
export function checkGitDirty(projectPath) {
    try {
        // Check if it's a git repo
        execSync('git rev-parse --git-dir', { cwd: projectPath, stdio: 'pipe' });
        // Get status of changed files
        const status = execSync('git status --porcelain', { cwd: projectPath, stdio: 'pipe' }).toString();
        const changedFiles = status
            .split('\n')
            .filter(line => line.trim())
            .map(line => line.slice(3).trim());
        return {
            isDirty: changedFiles.length > 0,
            changedFiles,
        };
    }
    catch {
        // Not a git repo or git not available - allow changes
        return { isDirty: false, changedFiles: [] };
    }
}
// Parse file changes from Claude output
function parseFilesChanged(output) {
    const files = [];
    // Look for common patterns in Claude's output indicating file changes
    // Pattern: "Modified: path/to/file" or "Updated: path/to/file" or "Created: path/to/file"
    const modifiedPattern = /(?:Modified|Updated|Created|Edited|Changed|Wrote to|Writing to):\s*[`"]?([^\s`"]+)[`"]?/gi;
    let match;
    while ((match = modifiedPattern.exec(output)) !== null) {
        const file = match[1].trim();
        if (file && !files.includes(file)) {
            files.push(file);
        }
    }
    // Also look for file paths in backticks that look like they were edited
    const backtickPattern = /`([^`]+\.(tsx?|jsx?|mdx?|html?|css|json|yml|yaml))`/gi;
    while ((match = backtickPattern.exec(output)) !== null) {
        const file = match[1].trim();
        if (file && !files.includes(file) && !file.includes(' ')) {
            files.push(file);
        }
    }
    return files;
}
// Detect current phase from output
function detectPhase(output) {
    const lowerOutput = output.toLowerCase();
    if (lowerOutput.includes('complete') || lowerOutput.includes('done') || lowerOutput.includes('finished')) {
        return 'complete';
    }
    if (lowerOutput.includes('editing') ||
        lowerOutput.includes('writing') ||
        lowerOutput.includes('updating') ||
        lowerOutput.includes('modifying') ||
        lowerOutput.includes('creating')) {
        return 'editing';
    }
    return 'thinking';
}
// Job timeout in milliseconds (5 minutes)
const JOB_TIMEOUT = 5 * 60 * 1000;
// Inactivity timeout - if no output for this long, warn (30 seconds)
const INACTIVITY_TIMEOUT = 30 * 1000;
export async function spawnClaudeJob(job, callbacks) {
    const prompt = buildPrompt(job);
    const claudePath = job.claudePath || 'claude';
    job.status = 'running';
    console.log(`[Job ${job.id}] Starting Claude...`);
    console.log(`[Job ${job.id}] Working directory: ${job.projectPath}`);
    console.log(`[Job ${job.id}] Claude path: ${claudePath}`);
    return new Promise((resolve, reject) => {
        // Spawn claude CLI with the prompt via stdin
        // Using -p for print mode and --dangerously-skip-permissions to avoid prompts
        const proc = spawn(claudePath, [
            '-p',
            '--dangerously-skip-permissions',
        ], {
            cwd: job.projectPath,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: {
                ...process.env,
                // Ensure we get clean output
                FORCE_COLOR: '0',
                NO_COLOR: '1',
            },
        });
        job.process = proc;
        console.log(`[Job ${job.id}] Claude spawned with PID ${proc.pid}`);
        // Send prompt via stdin
        proc.stdin?.write(prompt);
        proc.stdin?.end();
        console.log(`[Job ${job.id}] Prompt sent to Claude`);
        let fullOutput = '';
        let currentPhase = 'thinking';
        let lastOutputTime = Date.now();
        let inactivityWarned = false;
        // Timeout for entire job
        const jobTimeout = setTimeout(() => {
            if (job.status === 'running') {
                console.error(`[Job ${job.id}] Job timed out after ${JOB_TIMEOUT / 1000}s`);
                callbacks.onProgress('\n\n[TIMEOUT] Job exceeded maximum time limit.\n', 'complete');
                cancelJob(job);
            }
        }, JOB_TIMEOUT);
        // Check for inactivity
        const inactivityCheck = setInterval(() => {
            if (job.status !== 'running') {
                clearInterval(inactivityCheck);
                return;
            }
            const elapsed = Date.now() - lastOutputTime;
            if (elapsed > INACTIVITY_TIMEOUT && !inactivityWarned) {
                inactivityWarned = true;
                console.warn(`[Job ${job.id}] No output for ${elapsed / 1000}s - Claude may be stuck`);
                callbacks.onProgress(`\n[Waiting for Claude... no output for ${Math.round(elapsed / 1000)}s]\n`, currentPhase);
            }
        }, 5000);
        const handleOutput = (data) => {
            const text = data.toString();
            fullOutput += text;
            lastOutputTime = Date.now();
            inactivityWarned = false;
            // Log to bridge console
            process.stdout.write(text);
            const newPhase = detectPhase(text);
            if (newPhase !== currentPhase) {
                currentPhase = newPhase;
                console.log(`[Job ${job.id}] Phase: ${currentPhase}`);
            }
            callbacks.onProgress(text, currentPhase);
        };
        proc.stdout?.on('data', handleOutput);
        proc.stderr?.on('data', handleOutput);
        proc.on('error', (err) => {
            clearTimeout(jobTimeout);
            clearInterval(inactivityCheck);
            console.error(`[Job ${job.id}] Error:`, err.message);
            job.status = 'error';
            callbacks.onComplete(false, [], err.message);
            reject(err);
        });
        proc.on('close', (code) => {
            clearTimeout(jobTimeout);
            clearInterval(inactivityCheck);
            console.log(`[Job ${job.id}] Claude exited with code ${code}`);
            const filesChanged = parseFilesChanged(fullOutput);
            if (code === 0) {
                job.status = 'complete';
                job.filesChanged = filesChanged;
                console.log(`[Job ${job.id}] Complete. Files changed:`, filesChanged);
                callbacks.onComplete(true, filesChanged);
                resolve();
            }
            else if (job.status === 'cancelled') {
                console.log(`[Job ${job.id}] Cancelled`);
                callbacks.onComplete(false, [], 'Job cancelled');
                resolve();
            }
            else {
                job.status = 'error';
                console.error(`[Job ${job.id}] Failed with code ${code}`);
                callbacks.onComplete(false, filesChanged, `Claude exited with code ${code}`);
                resolve();
            }
        });
    });
}
export function cancelJob(job) {
    if (job.process && job.status === 'running') {
        job.status = 'cancelled';
        job.process.kill('SIGTERM');
        // Force kill after 5 seconds if still running
        setTimeout(() => {
            if (job.process && !job.process.killed) {
                job.process.kill('SIGKILL');
            }
        }, 5000);
    }
}
//# sourceMappingURL=claude.js.map