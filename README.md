# Jammin CMS

Jammin CMS is a Chrome extension for inline website editing powered by Claude Code. Edit text directly on your live site, and Claude applies the changes to your local source files.

## How It Works

1. Configure a site with its URL pattern and local project path
2. Browse to your site and activate editing via the extension popup
3. Toggle editing mode and modify content directly in the browser
4. Click Save — Claude Code finds the right files and makes the changes

The extension communicates with a local bridge server that spawns Claude Code to handle the file modifications intelligently.

## Requirements

- Node.js 18+
- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed and authenticated
- Chrome or Chromium-based browser

## Installation

```bash
npx jammincms
```

On first run, this extracts the Chrome extension to `./jammin-cms-extension` and starts the bridge server.

Load the extension in Chrome:

1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked" and select the `jammin-cms-extension` folder

The bridge runs on `ws://localhost:9876` by default. Use `-p` to specify a different port.

### Local Development

To run the extension in development mode, clone this repo, run `npm install`, and then run:

```bash
npm run dev:bridge
```

This will start the bridge server in development mode.

You can install the extension locally by running:

```bash
npm run dev:extension
```

Then load the `extension/dist` folder as an unpacked extension in Chrome (see [Installation](#installation) steps 1–3).

## Configuration

Click the extension icon and go to Settings to configure:

- **Bridge URL** — WebSocket URL for the bridge server (default: `ws://localhost:9876`)
- **Claude CLI Path** — Full path to the Claude CLI if not in your PATH

### Adding a Site

1. Click "Add Site" in Settings
2. Fill in:
   - **Name** — Display name for the site
   - **URL Pattern** — Glob pattern like `https://example.com/*`
   - **Local Project Path** — Absolute path to your project
   - **Custom Instructions** — Optional context for Claude (e.g., "This is a Next.js blog using MDX files in /posts")
   - **Editable Selectors** — CSS selectors for editable regions (defaults to `main`, `article`, `[role="main"]`)

## Usage

1. Start the bridge server
2. Navigate to a configured site
3. Click the Jammin CMS extension icon
4. Click "Activate Editing"
5. Toggle "Enable editing" in the toolbar that appears
6. Edit content directly on the page
7. Click Save to send changes to Claude

The Output panel shows Claude's progress and which files were modified.

## Safety

- Git dirty check: If your project has uncommitted changes, you'll be prompted before proceeding
- Changes are made to your local files only — review and commit as needed
- Editing must be explicitly activated each session

## License

MIT
