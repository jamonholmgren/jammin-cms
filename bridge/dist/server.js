import { WebSocketServer, WebSocket } from 'ws';
import { spawnClaudeJob, cancelJob, checkClaudeAvailable, checkGitDirty } from './claude.js';
import { openInEditor } from './editor.js';
const VERSION = '1.0.0';
const DEFAULT_PORT = 9876;
// Active jobs tracked by job ID
const jobs = new Map();
// Connected clients
const clients = new Set();
export function broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    }
}
export function sendToClient(client, message) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
    }
}
async function handleMessage(client, message) {
    switch (message.type) {
        case 'ping': {
            const claudeAvailable = await checkClaudeAvailable();
            sendToClient(client, {
                type: 'pong',
                version: VERSION,
                claudeAvailable,
            });
            break;
        }
        case 'submit_edit': {
            await handleSubmitEdit(client, message);
            break;
        }
        case 'cancel_job': {
            handleCancelJob(client, message);
            break;
        }
        case 'open_editor': {
            await handleOpenEditor(client, message);
            break;
        }
        default: {
            sendToClient(client, {
                type: 'error',
                message: `Unknown message type: ${message.type}`,
                code: 'UNKNOWN_MESSAGE_TYPE',
            });
        }
    }
}
async function handleSubmitEdit(client, message) {
    const { jobId, projectPath, siteUrl, changes, customInstructions, claudePath, skipGitCheck } = message;
    const shortId = jobId.slice(0, 8);
    console.log(`[Job ${shortId}] submit_edit received — ${changes.length} change(s), path: ${projectPath}, url: ${siteUrl}`);
    if (skipGitCheck)
        console.log(`[Job ${shortId}] Skipping git check`);
    // Check if job already exists
    if (jobs.has(jobId)) {
        sendToClient(client, {
            type: 'error',
            message: `Job ${jobId} already exists`,
            code: 'JOB_EXISTS',
        });
        return;
    }
    // Check for uncommitted git changes (unless skipped)
    if (!skipGitCheck) {
        console.log(`[Job ${shortId}] Checking git status...`);
        const gitStatus = checkGitDirty(projectPath);
        if (gitStatus.isDirty) {
            console.log(`[Job ${shortId}] Git dirty — ${gitStatus.changedFiles.length} changed files`);
            sendToClient(client, {
                type: 'git_dirty',
                jobId,
                changedFiles: gitStatus.changedFiles,
            });
            return;
        }
    }
    // Create job
    const job = {
        id: jobId,
        projectPath,
        siteUrl,
        changes,
        customInstructions,
        claudePath,
        status: 'pending',
        output: '',
        filesChanged: [],
    };
    jobs.set(jobId, job);
    // Acknowledge job
    sendToClient(client, {
        type: 'job_accepted',
        jobId,
    });
    // Spawn Claude process
    try {
        await spawnClaudeJob(job, {
            onProgress: (output, phase) => {
                job.output += output;
                broadcast({
                    type: 'job_progress',
                    jobId,
                    output,
                    phase,
                });
            },
            onComplete: (success, filesChanged, error) => {
                job.status = success ? 'complete' : 'error';
                job.filesChanged = filesChanged || [];
                broadcast({
                    type: 'job_complete',
                    jobId,
                    success,
                    filesChanged,
                    error,
                });
                // Clean up job after some time
                setTimeout(() => jobs.delete(jobId), 60000);
            },
        });
    }
    catch (err) {
        job.status = 'error';
        sendToClient(client, {
            type: 'job_complete',
            jobId,
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
        });
    }
}
function handleCancelJob(client, message) {
    const { jobId } = message;
    const job = jobs.get(jobId);
    if (!job) {
        sendToClient(client, {
            type: 'error',
            message: `Job ${jobId} not found`,
            code: 'JOB_NOT_FOUND',
        });
        return;
    }
    cancelJob(job);
    job.status = 'cancelled';
    broadcast({
        type: 'job_cancelled',
        jobId,
    });
}
async function handleOpenEditor(client, message) {
    const { projectPath, file } = message;
    try {
        await openInEditor(projectPath, file);
    }
    catch (err) {
        sendToClient(client, {
            type: 'error',
            message: err instanceof Error ? err.message : 'Failed to open editor',
            code: 'EDITOR_ERROR',
        });
    }
}
export function startServer(port = DEFAULT_PORT) {
    const wss = new WebSocketServer({ port });
    console.log(`Jammin CMS Bridge v${VERSION}`);
    console.log(`WebSocket server listening on ws://localhost:${port}`);
    wss.on('connection', (ws) => {
        console.log('Client connected');
        clients.add(ws);
        ws.on('message', async (data) => {
            try {
                const message = JSON.parse(data.toString());
                console.log(`Received: ${message.type}`);
                await handleMessage(ws, message);
            }
            catch (err) {
                console.error('Error handling message:', err);
                sendToClient(ws, {
                    type: 'error',
                    message: err instanceof Error ? err.message : 'Invalid message',
                    code: 'INVALID_MESSAGE',
                });
            }
        });
        ws.on('close', () => {
            console.log('Client disconnected');
            clients.delete(ws);
        });
        ws.on('error', (err) => {
            console.error('WebSocket error:', err);
            clients.delete(ws);
        });
    });
    wss.on('error', (err) => {
        console.error('Server error:', err);
    });
    return wss;
}
export function getJobs() {
    return jobs;
}
//# sourceMappingURL=server.js.map