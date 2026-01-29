#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server.js';
import { checkClaudeAvailable } from './claude.js';
const program = new Command();
async function start(port) {
    if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Invalid port number');
        process.exit(1);
    }
    // Check if Claude CLI is available
    const claudeAvailable = await checkClaudeAvailable();
    if (!claudeAvailable) {
        console.warn('Warning: Claude CLI not found in PATH');
        console.warn('Install it with: npm install -g @anthropic-ai/claude-code');
        console.warn('The server will start but edit jobs will fail.');
    }
    else {
        console.log('Claude CLI: available');
    }
    // Start the server
    const server = startServer(port);
    // Handle graceful shutdown
    const shutdown = () => {
        console.log('\nShutting down...');
        server.close(() => {
            console.log('Server closed');
            process.exit(0);
        });
        // Force exit after 5 seconds
        setTimeout(() => {
            console.log('Forcing exit');
            process.exit(1);
        }, 5000);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
program
    .name('jammincms')
    .description('Local bridge server for Jammin CMS Chrome extension')
    .version('1.0.0')
    .option('-p, --port <port>', 'Port to listen on', '9876')
    .action(async (options) => {
    const port = parseInt(options.port, 10);
    await start(port);
});
program
    .command('status')
    .description('Check if the bridge server is running')
    .option('-p, --port <port>', 'Port to check', '9876')
    .action(async (options) => {
    const port = parseInt(options.port, 10);
    const WebSocket = (await import('ws')).default;
    const ws = new WebSocket(`ws://localhost:${port}`);
    const timeout = setTimeout(() => {
        console.log('Bridge server: not running');
        ws.close();
        process.exit(1);
    }, 2000);
    ws.on('open', () => {
        ws.send(JSON.stringify({ type: 'ping' }));
    });
    ws.on('message', (data) => {
        clearTimeout(timeout);
        try {
            const response = JSON.parse(data.toString());
            if (response.type === 'pong') {
                console.log(`Bridge server: running (v${response.version})`);
                console.log(`Claude CLI: ${response.claudeAvailable ? 'available' : 'not found'}`);
            }
        }
        catch {
            console.log('Bridge server: running (invalid response)');
        }
        ws.close();
        process.exit(0);
    });
    ws.on('error', () => {
        clearTimeout(timeout);
        console.log('Bridge server: not running');
        process.exit(1);
    });
});
program.parse();
//# sourceMappingURL=index.js.map