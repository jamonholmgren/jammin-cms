import { WebSocketServer, WebSocket } from 'ws';
import type { BridgeMessage, Job } from './types.js';
export declare function broadcast(message: BridgeMessage): void;
export declare function sendToClient(client: WebSocket, message: BridgeMessage): void;
export declare function startServer(port?: number): WebSocketServer;
export declare function getJobs(): Map<string, Job>;
//# sourceMappingURL=server.d.ts.map