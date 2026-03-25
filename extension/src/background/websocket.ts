import type {
  ExtensionToBridgeMessage,
  BridgeToExtensionMessage,
  ConnectionStatus,
  JobStatus,
} from '../shared/types';
import { getSettings } from './config';

type MessageHandler = (message: BridgeToExtensionMessage) => void;

class BridgeConnection {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageHandlers = new Set<MessageHandler>();
  private connectionStatus: ConnectionStatus = { connected: false };
  private pendingMessages: ExtensionToBridgeMessage[] = [];
  private jobs = new Map<string, JobStatus>();

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    const settings = await getSettings();
    const url = settings.bridgeUrl;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[Jammin] Connected to bridge');
        this.connectionStatus = { connected: true };

        // Send ping to get status
        this.send({ type: 'ping' });

        // Send any pending messages
        for (const msg of this.pendingMessages) {
          this.send(msg);
        }
        this.pendingMessages = [];
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as BridgeToExtensionMessage;
          const jobId = 'jobId' in message ? (message as { jobId: string }).jobId : undefined;
          console.log(`[Jammin] Bridge → ext: ${message.type}${jobId ? ` (job ${jobId.slice(0, 8)})` : ''}`);
          this.handleMessage(message);
        } catch (err) {
          console.error('[Jammin] Failed to parse bridge message:', err, event.data);
        }
      };

      this.ws.onclose = () => {
        console.log('[Jammin] Disconnected from bridge');
        this.connectionStatus = { connected: false };
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[Jammin] WebSocket error:', err);
        this.connectionStatus = {
          connected: false,
          error: 'Connection failed',
        };
      };
    } catch (err) {
      console.error('[Jammin] Failed to connect:', err);
      this.connectionStatus = {
        connected: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      };
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    // Reconnect after 5 seconds
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  private handleMessage(message: BridgeToExtensionMessage): void {
    // Update connection status on pong
    if (message.type === 'pong') {
      this.connectionStatus = {
        connected: true,
        bridgeVersion: message.version,
        claudeAvailable: message.claudeAvailable,
      };
    }

    // Track job status
    if ('jobId' in message && message.jobId) {
      this.updateJobStatus(message);
    }

    // Notify all handlers
    for (const handler of this.messageHandlers) {
      try {
        handler(message);
      } catch (err) {
        console.error('[Jammin] Message handler error:', err);
      }
    }
  }

  private updateJobStatus(message: BridgeToExtensionMessage): void {
    if (!('jobId' in message) || !message.jobId) return;

    const jobId = message.jobId;
    let job = this.jobs.get(jobId);

    switch (message.type) {
      case 'job_accepted':
        this.jobs.set(jobId, {
          id: jobId,
          status: 'pending',
          output: '',
          phase: 'thinking',
        });
        break;

      case 'job_progress':
        if (job) {
          job.output += message.output;
          job.phase = message.phase;
          job.status = 'running';
        }
        break;

      case 'job_complete':
        if (job) {
          job.status = message.success ? 'complete' : 'error';
          job.filesChanged = message.filesChanged;
          job.error = message.error;
        }
        break;

      case 'job_cancelled':
        if (job) {
          job.status = 'cancelled';
        }
        break;
    }
  }

  public send(message: ExtensionToBridgeMessage): void {
    const jobId = 'jobId' in message ? (message as { jobId: string }).jobId : undefined;
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`[Jammin] Ext → bridge: ${message.type}${jobId ? ` (job ${jobId.slice(0, 8)})` : ''}`);
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn(`[Jammin] Bridge not connected, queuing: ${message.type} (ws state: ${this.ws?.readyState ?? 'null'})`);
      this.pendingMessages.push(message);
      this.connect();
    }
  }

  public getStatus(): ConnectionStatus {
    return this.connectionStatus;
  }

  public getJobStatus(jobId: string): JobStatus | undefined {
    return this.jobs.get(jobId);
  }

  public addMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
  }

  public removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.delete(handler);
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Singleton instance
export const bridgeConnection = new BridgeConnection();
