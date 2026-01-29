#!/usr/bin/env node
import { Command } from 'commander';
import { startServer } from './server.js';
import { checkClaudeAvailable } from './claude.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
const program = new Command();
const EXTENSION_FOLDER = 'jammin-cms-extension';
function getExtensionSource() {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    return join(__dirname, '..', 'extension');
}
function getExtensionDir() {
    return join(process.cwd(), EXTENSION_FOLDER);
}
function ensureExtensionInstalled() {
    const extensionSource = getExtensionSource();
    const extensionDir = getExtensionDir();
    if (!existsSync(extensionSource)) {
        return { installed: false, path: extensionDir, fresh: false };
    }
    const alreadyExists = existsSync(extensionDir);
    if (!alreadyExists) {
        mkdirSync(extensionDir, { recursive: true });
        cpSync(extensionSource, extensionDir, { recursive: true });
    }
    return { installed: true, path: extensionDir, fresh: !alreadyExists };
}
function printExtensionInstructions(path) {
    console.log('\n┌─────────────────────────────────────────────────────────┐');
    console.log('│  Chrome Extension Setup                                 │');
    console.log('├─────────────────────────────────────────────────────────┤');
    console.log('│  1. Open chrome://extensions                            │');
    console.log('│  2. Enable "Developer mode" (top right)                 │');
    console.log('│  3. Click "Load unpacked" and select:                   │');
    console.log(`│     ${path}`);
    console.log('└─────────────────────────────────────────────────────────┘\n');
}
async function start(port) {
    if (isNaN(port) || port < 1 || port > 65535) {
        console.error('Invalid port number');
        process.exit(1);
    }
    // Ensure extension is available
    const ext = ensureExtensionInstalled();
    if (ext.fresh) {
        console.log('Extension installed to:', ext.path);
        printExtensionInstructions(ext.path);
    }
    // Check if Claude CLI is available
    const claudeAvailable = await checkClaudeAvailable();
    if (!claudeAvailable) {
        console.warn('Warning: Claude CLI not found in PATH');
        console.warn('Install it with: npm install -g @anthropic-ai/claude-code');
        console.warn('The server will start but edit jobs will fail.\n');
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
    .version('0.1.3')
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
program
    .command('extension-path')
    .description('Print the path to the Chrome extension')
    .action(() => {
    const ext = ensureExtensionInstalled();
    if (!ext.installed) {
        console.error('Extension files not found in package.');
        process.exit(1);
    }
    console.log(ext.path);
});
program
    .command('reinstall-extension')
    .description('Reinstall the Chrome extension (replaces existing)')
    .action(() => {
    const extensionSource = getExtensionSource();
    const extensionDir = getExtensionDir();
    if (!existsSync(extensionSource)) {
        console.error('Extension files not found in package.');
        process.exit(1);
    }
    if (existsSync(extensionDir)) {
        rmSync(extensionDir, { recursive: true });
    }
    mkdirSync(extensionDir, { recursive: true });
    cpSync(extensionSource, extensionDir, { recursive: true });
    console.log('Extension reinstalled to:', extensionDir);
    printExtensionInstructions(extensionDir);
});
program.parse();
//# sourceMappingURL=index.js.map