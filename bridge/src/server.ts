import { WebSocketServer, WebSocket } from 'ws';
import type {
  ExtensionMessage,
  BridgeMessage,
  SubmitEditMessage,
  CancelJobMessage,
  OpenEditorMessage,
  Job,
} from './types.js';
import { spawnClaudeJob, cancelJob, checkClaudeAvailable, checkGitDirty } from './claude.js';
import { openInEditor } from './editor.js';

const VERSION = '1.0.0';
const DEFAULT_PORT = 9876;

// Active jobs tracked by job ID
const jobs = new Map<string, Job>();

// Connected clients
const clients = new Set<WebSocket>();

export function broadcast(message: BridgeMessage): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function sendToClient(client: WebSocket, message: BridgeMessage): void {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(message));
  }
}

async function handleMessage(
  client: WebSocket,
  message: ExtensionMessage
): Promise<void> {
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
        message: `Unknown message type: ${(message as { type: string }).type}`,
        code: 'UNKNOWN_MESSAGE_TYPE',
      });
    }
  }
}

async function handleSubmitEdit(
  client: WebSocket,
  message: SubmitEditMessage
): Promise<void> {
  const { jobId, projectPath, siteUrl, changes, customInstructions, claudePath, skipGitCheck } = message;

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
    const gitStatus = checkGitDirty(projectPath);
    if (gitStatus.isDirty) {
      sendToClient(client, {
        type: 'git_dirty',
        jobId,
        changedFiles: gitStatus.changedFiles,
      });
      return;
    }
  }

  // Create job
  const job: Job = {
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
  } catch (err) {
    job.status = 'error';
    sendToClient(client, {
      type: 'job_complete',
      jobId,
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    });
  }
}

function handleCancelJob(client: WebSocket, message: CancelJobMessage): void {
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

async function handleOpenEditor(
  client: WebSocket,
  message: OpenEditorMessage
): Promise<void> {
  const { projectPath, file } = message;

  try {
    await openInEditor(projectPath, file);
  } catch (err) {
    sendToClient(client, {
      type: 'error',
      message: err instanceof Error ? err.message : 'Failed to open editor',
      code: 'EDITOR_ERROR',
    });
  }
}

export function startServer(port: number = DEFAULT_PORT): WebSocketServer {
  const wss = new WebSocketServer({ port });

  console.log(`Jammin CMS Bridge v${VERSION}`);
  console.log(`WebSocket server listening on ws://localhost:${port}`);

  wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.add(ws);

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as ExtensionMessage;
        await handleMessage(ws, message);
      } catch (err) {
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

export function getJobs(): Map<string, Job> {
  return jobs;
}
