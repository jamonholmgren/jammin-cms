// CSS styles for the toolbar with integrated output drawer
// Using a function to keep styles in JS for easy bundling

export function getStyles(): string {
  return `
    /* Reset */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    /* Variables */
    :host {
      --jammin-primary: #6366f1;
      --jammin-primary-hover: #4f46e5;
      --jammin-bg: #1e1e2e;
      --jammin-bg-light: #2a2a3e;
      --jammin-text: #e0e0e0;
      --jammin-text-muted: #a0a0a0;
      --jammin-border: #3a3a4e;
      --jammin-success: #22c55e;
      --jammin-warning: #f59e0b;
      --jammin-error: #ef4444;
      --jammin-radius: 8px;
      --jammin-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.5;
    }

    /* Toggle Button */
    .jammin-toggle {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--jammin-primary);
      border: none;
      color: white;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--jammin-shadow);
      transition: transform 0.2s, background-color 0.2s;
      z-index: 2147483647;
    }

    .jammin-toggle:hover {
      background: var(--jammin-primary-hover);
      transform: scale(1.05);
    }

    .jammin-toggle.hidden {
      transform: scale(0);
      pointer-events: none;
    }

    .jammin-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      min-width: 20px;
      height: 20px;
      background: var(--jammin-error);
      border-radius: 10px;
      font-size: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 6px;
    }

    /* Toolbar Container */
    .jammin-toolbar {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 2147483647;
    }

    /* Panel Wrapper - contains both main panel and output drawer */
    .jammin-panel-wrapper {
      position: absolute;
      bottom: 0;
      right: 0;
      display: flex;
      align-items: flex-end;
      gap: 8px;
      transform: scale(0.9);
      opacity: 0;
      pointer-events: none;
      transition: transform 0.2s, opacity 0.2s;
      transform-origin: bottom right;
    }

    .jammin-panel-wrapper.expanded {
      transform: scale(1);
      opacity: 1;
      pointer-events: auto;
    }

    /* Main Panel */
    .jammin-panel {
      width: 280px;
      background: var(--jammin-bg);
      border: 1px solid var(--jammin-border);
      border-radius: var(--jammin-radius);
      box-shadow: var(--jammin-shadow);
      overflow: hidden;
    }

    .jammin-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      background: var(--jammin-bg-light);
      border-bottom: 1px solid var(--jammin-border);
    }

    .jammin-title {
      font-weight: 600;
      color: var(--jammin-text);
    }

    .jammin-close {
      background: none;
      border: none;
      color: var(--jammin-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jammin-close:hover {
      background: var(--jammin-border);
      color: var(--jammin-text);
    }

    .jammin-content {
      padding: 16px;
    }

    .jammin-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      color: var(--jammin-text);
    }

    /* Toggle Switch */
    .jammin-switch {
      position: relative;
      width: 40px;
      height: 22px;
      flex-shrink: 0;
    }

    .jammin-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .jammin-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: var(--jammin-border);
      transition: 0.2s;
      border-radius: 22px;
    }

    .jammin-slider:before {
      position: absolute;
      content: "";
      height: 16px;
      width: 16px;
      left: 3px;
      bottom: 3px;
      background-color: white;
      transition: 0.2s;
      border-radius: 50%;
    }

    .jammin-switch input:checked + .jammin-slider {
      background-color: var(--jammin-primary);
    }

    .jammin-switch input:checked + .jammin-slider:before {
      transform: translateX(18px);
    }

    /* Actions */
    .jammin-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .jammin-btn {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 12px;
      border: 1px solid var(--jammin-border);
      border-radius: 6px;
      background: var(--jammin-bg-light);
      color: var(--jammin-text);
      font-size: 13px;
      cursor: pointer;
      transition: background-color 0.2s, border-color 0.2s;
    }

    .jammin-btn:hover:not(:disabled) {
      background: var(--jammin-border);
    }

    .jammin-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .jammin-btn-primary {
      background: var(--jammin-primary);
      border-color: var(--jammin-primary);
    }

    .jammin-btn-primary:hover:not(:disabled) {
      background: var(--jammin-primary-hover);
    }

    .jammin-divider {
      height: 1px;
      background: var(--jammin-border);
      margin: 12px 0;
    }

    .jammin-status-text {
      font-size: 12px;
      color: var(--jammin-text-muted);
      text-align: center;
    }

    /* Output Drawer - slides out to the left */
    .jammin-output-drawer {
      width: 350px;
      max-height: 400px;
      background: var(--jammin-bg);
      border: 1px solid var(--jammin-border);
      border-radius: var(--jammin-radius);
      box-shadow: var(--jammin-shadow);
      display: flex;
      flex-direction: column;
      transform: translateX(calc(100% + 16px));
      opacity: 0;
      pointer-events: none;
      transition: transform 0.3s, opacity 0.3s;
      position: absolute;
      right: calc(100% + 8px);
      bottom: 0;
    }

    .jammin-output-drawer.expanded {
      transform: translateX(0);
      opacity: 1;
      pointer-events: auto;
    }

    .jammin-output-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      background: var(--jammin-bg-light);
      border-bottom: 1px solid var(--jammin-border);
      border-radius: var(--jammin-radius) var(--jammin-radius) 0 0;
      flex-shrink: 0;
    }

    .jammin-output-title {
      display: flex;
      align-items: center;
      gap: 8px;
      color: var(--jammin-text);
      font-weight: 500;
    }

    .jammin-output-close {
      background: none;
      border: none;
      color: var(--jammin-text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .jammin-output-close:hover {
      background: var(--jammin-border);
      color: var(--jammin-text);
    }

    .jammin-output-body {
      flex: 1;
      overflow: auto;
      padding: 12px;
      min-height: 100px;
      max-height: 250px;
    }

    .jammin-output-content {
      font-family: 'SF Mono', 'Menlo', 'Monaco', monospace;
      font-size: 12px;
      line-height: 1.6;
      color: var(--jammin-text);
      white-space: pre-wrap;
      word-break: break-word;
      margin: 0;
    }

    .jammin-output-footer {
      padding: 10px 14px;
      border-top: 1px solid var(--jammin-border);
      background: var(--jammin-bg-light);
      border-radius: 0 0 var(--jammin-radius) var(--jammin-radius);
      flex-shrink: 0;
    }

    .jammin-output-footer:empty {
      display: none;
    }

    /* Status Indicator */
    .jammin-status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--jammin-text-muted);
      flex-shrink: 0;
    }

    .jammin-status-indicator.phase-thinking {
      background: var(--jammin-warning);
      animation: pulse 1.5s infinite;
    }

    .jammin-status-indicator.phase-editing {
      background: var(--jammin-primary);
      animation: pulse 1s infinite;
    }

    .jammin-status-indicator.phase-complete {
      background: var(--jammin-success);
    }

    .jammin-status-indicator.phase-error {
      background: var(--jammin-error);
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    /* Files list */
    .jammin-files-header {
      font-size: 12px;
      font-weight: 500;
      color: var(--jammin-text);
      margin-bottom: 6px;
    }

    .jammin-files-list {
      list-style: none;
      font-size: 12px;
      color: var(--jammin-success);
    }

    .jammin-files-list li {
      padding: 2px 0;
    }

    .jammin-files-list li::before {
      content: "\\2713 ";
    }

    .jammin-error {
      font-size: 12px;
      color: var(--jammin-error);
    }
  `;
}

// Global styles injected into the page (not shadow DOM)
export function getPageStyles(): string {
  return `
    .jammin-editable {
      outline: 2px dashed transparent;
      outline-offset: 2px;
      transition: outline-color 0.2s;
    }

    /* Show dashed outline on all editable elements when editing is active */
    body.jammin-editing-active .jammin-editable {
      outline-color: rgba(99, 102, 241, 0.5);
    }

    .jammin-editable:focus {
      outline-color: #6366f1;
      outline-style: solid;
    }

    .jammin-editable.jammin-dirty {
      outline-color: #f59e0b;
    }

    .jammin-editable.jammin-dirty:focus {
      outline-color: #f59e0b;
      outline-style: solid;
    }

    /* Selection Toolbar */
    .jammin-selection-toolbar {
      position: absolute;
      display: none;
      align-items: center;
      gap: 2px;
      padding: 4px 6px;
      background: #1e1e2e;
      border: 1px solid #3a3a4e;
      border-radius: 6px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 2147483646;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    .jammin-selection-toolbar button {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 28px;
      padding: 0 8px;
      background: transparent;
      border: none;
      border-radius: 4px;
      color: #e0e0e0;
      font-size: 13px;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .jammin-selection-toolbar button:hover {
      background: #3a3a4e;
    }

    .jammin-selection-toolbar button strong {
      font-weight: 700;
    }

    .jammin-selection-toolbar button em {
      font-style: italic;
    }

    .jammin-selection-toolbar .jammin-sel-divider {
      width: 1px;
      height: 20px;
      background: #3a3a4e;
      margin: 0 4px;
    }
  `;
}
