var m=Object.defineProperty;var h=(l,t,e)=>t in l?m(l,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):l[t]=e;var o=(l,t,e)=>h(l,typeof t!="symbol"?t+"":t,e);function u(l){const t=[];let e=l;for(;e&&e!==document.body;){let i=e.tagName.toLowerCase();if(e.id){i=`#${e.id}`,t.unshift(i);break}if(e.className&&typeof e.className=="string"){const a=e.className.split(/\s+/).filter(s=>s&&!s.startsWith("jammin-")).slice(0,2);a.length>0&&(i+=`.${a.join(".")}`)}const n=e.parentElement;if(n){const a=Array.from(n.children).filter(s=>s.tagName===e.tagName);if(a.length>1){const s=a.indexOf(e)+1;i+=`:nth-child(${s})`}}t.unshift(i),e=e.parentElement}return t.join(" > ")}function p(l){const t=[];let e=l;for(;e&&e!==document.body;){let i=e.tagName.toLowerCase();if(e.id)i+=`#${e.id}`;else if(e.className&&typeof e.className=="string"){const n=e.className.split(/\s+/).filter(a=>a&&!a.startsWith("jammin-")).slice(0,2);n.length>0&&(i+=`.${n.join(".")}`)}if(t.unshift(i),e=e.parentElement,t.length>=4)break}return t.join(" > ")}class b{constructor(){o(this,"trackedElements",new Map);o(this,"config",null);o(this,"mutationObserver",null);o(this,"enabled",!1);o(this,"onDirtyChange",null);o(this,"selectionToolbar",null);this.handleInput=this.handleInput.bind(this),this.handleKeydown=this.handleKeydown.bind(this),this.handleSelectionChange=this.handleSelectionChange.bind(this),this.handleFormatCommand=this.handleFormatCommand.bind(this)}setConfig(t){this.config=t}setDirtyChangeHandler(t){this.onDirtyChange=t}enable(){this.enabled||!this.config||(this.enabled=!0,this.setupEditableElements(),this.createSelectionToolbar(),this.startObserving(),document.addEventListener("keydown",this.handleKeydown),document.addEventListener("selectionchange",this.handleSelectionChange))}disable(){this.enabled&&(this.enabled=!1,this.stopObserving(),this.removeAllEditable(),this.destroySelectionToolbar(),document.removeEventListener("keydown",this.handleKeydown),document.removeEventListener("selectionchange",this.handleSelectionChange))}isEnabled(){return this.enabled}setupEditableElements(){if(this.config)for(const t of this.config.editableSelectors)document.querySelectorAll(t).forEach(i=>this.makeEditable(i))}makeEditable(t){if(this.trackedElements.has(t))return;t.contentEditable="true",t.classList.add("jammin-editable");const e={element:t,originalContent:t.innerHTML,selector:u(t),elementPath:p(t),isDirty:!1};this.trackedElements.set(t,e),t.addEventListener("input",this.handleInput)}removeEditable(t){this.trackedElements.get(t)&&(t.contentEditable="false",t.classList.remove("jammin-editable","jammin-dirty"),t.removeEventListener("input",this.handleInput),this.trackedElements.delete(t))}removeAllEditable(){for(const[t]of this.trackedElements)this.removeEditable(t)}handleInput(t){const e=t.target,i=this.trackedElements.get(e);if(!i)return;const a=e.innerHTML!==i.originalContent;a!==i.isDirty&&(i.isDirty=a,e.classList.toggle("jammin-dirty",a),this.notifyDirtyChange())}handleKeydown(t){if((t.metaKey||t.ctrlKey)&&t.key==="s"&&this.hasDirtyElements()&&(t.preventDefault(),document.dispatchEvent(new CustomEvent("jammin:save"))),(t.metaKey||t.ctrlKey)&&this.isInEditableArea())switch(t.key.toLowerCase()){case"b":t.preventDefault(),this.execFormat("bold");break;case"i":t.preventDefault(),this.execFormat("italic");break;case"k":t.preventDefault(),this.promptAndCreateLink();break;case"7":t.preventDefault(),this.execFormat("insertOrderedList");break;case"8":t.preventDefault(),this.execFormat("insertUnorderedList");break}if(t.key==="Escape"){const e=document.activeElement;e&&this.trackedElements.has(e)&&(this.revertElement(e),e.blur())}}isInEditableArea(){var n,a;const t=window.getSelection();if(!t||t.isCollapsed)return!1;const e=t.anchorNode;return e?!!((a=(n=e.parentElement||e)==null?void 0:n.closest)==null?void 0:a.call(n,'[contenteditable="true"]')):!1}createSelectionToolbar(){if(this.selectionToolbar)return;const t=document.createElement("div");t.className="jammin-selection-toolbar",t.innerHTML=`
      <button data-cmd="bold" title="Bold (Cmd+B)"><strong>B</strong></button>
      <button data-cmd="italic" title="Italic (Cmd+I)"><em>I</em></button>
      <button data-cmd="createLink" title="Link (Cmd+K)">Link</button>
      <span class="jammin-sel-divider"></span>
      <button data-cmd="formatBlock" data-value="h2" title="Heading 2">H2</button>
      <button data-cmd="formatBlock" data-value="h3" title="Heading 3">H3</button>
      <button data-cmd="formatBlock" data-value="p" title="Paragraph">P</button>
      <span class="jammin-sel-divider"></span>
      <button data-cmd="insertOrderedList" title="Numbered List (Cmd+7)">1.</button>
      <button data-cmd="insertUnorderedList" title="Bullet List (Cmd+8)">&bull;</button>
    `,t.querySelectorAll("button").forEach(e=>{e.addEventListener("mousedown",i=>{i.preventDefault()}),e.addEventListener("click",this.handleFormatCommand)}),document.body.appendChild(t),this.selectionToolbar=t}destroySelectionToolbar(){this.selectionToolbar&&(this.selectionToolbar.remove(),this.selectionToolbar=null)}handleSelectionChange(){var n,a;const t=window.getSelection();if(!t||t.isCollapsed||t.toString().trim()===""){this.hideSelectionToolbar();return}const e=t.anchorNode;if(!e)return;if(!((a=(n=e.parentElement||e)==null?void 0:n.closest)==null?void 0:a.call(n,'[contenteditable="true"]'))){this.hideSelectionToolbar();return}this.showSelectionToolbar(t)}showSelectionToolbar(t){if(!this.selectionToolbar)return;const i=t.getRangeAt(0).getBoundingClientRect();this.selectionToolbar.style.display="flex",this.selectionToolbar.style.top=i.top-40+window.scrollY+"px",this.selectionToolbar.style.left=i.left+i.width/2-this.selectionToolbar.offsetWidth/2+"px"}hideSelectionToolbar(){this.selectionToolbar&&(this.selectionToolbar.style.display="none")}handleFormatCommand(t){const e=t.target,i=e.dataset.cmd,n=e.dataset.value;i&&(i==="createLink"?this.promptAndCreateLink():i==="formatBlock"&&n?this.execFormat(i,"<"+n+">"):this.execFormat(i),this.hideSelectionToolbar())}execFormat(t,e=null){document.execCommand(t,!1,e),this.markAllEditedElementsDirty()}promptAndCreateLink(){const t=prompt("Enter URL:");t&&(document.execCommand("createLink",!1,t),this.markAllEditedElementsDirty()),this.hideSelectionToolbar()}markAllEditedElementsDirty(){for(const[t,e]of this.trackedElements){const n=t.innerHTML!==e.originalContent;n!==e.isDirty&&(e.isDirty=n,t.classList.toggle("jammin-dirty",n))}this.notifyDirtyChange()}startObserving(){this.mutationObserver||(this.mutationObserver=new MutationObserver(t=>{for(const e of t)for(const i of e.addedNodes)i instanceof HTMLElement&&this.checkNewElement(i)}),this.mutationObserver.observe(document.body,{childList:!0,subtree:!0}))}stopObserving(){this.mutationObserver&&(this.mutationObserver.disconnect(),this.mutationObserver=null)}checkNewElement(t){if(this.config)for(const e of this.config.editableSelectors)t.matches(e)&&this.makeEditable(t),t.querySelectorAll(e).forEach(i=>{this.makeEditable(i)})}notifyDirtyChange(){this.onDirtyChange&&this.onDirtyChange(this.hasDirtyElements())}hasDirtyElements(){for(const[,t]of this.trackedElements)if(t.isDirty)return!0;return!1}getDirtyChanges(){const t=[];for(const[e,i]of this.trackedElements)i.isDirty&&t.push({elementPath:i.elementPath,selector:i.selector,originalContent:i.originalContent,newContent:e.innerHTML});return t}revertElement(t){const e=this.trackedElements.get(t);e&&(t.innerHTML=e.originalContent,e.isDirty=!1,t.classList.remove("jammin-dirty"),this.notifyDirtyChange())}revertAll(){for(const[t,e]of this.trackedElements)e.isDirty&&(t.innerHTML=e.originalContent,e.isDirty=!1,t.classList.remove("jammin-dirty"));this.notifyDirtyChange()}markSaved(){for(const[t,e]of this.trackedElements)e.isDirty&&(e.originalContent=t.innerHTML,e.isDirty=!1,t.classList.remove("jammin-dirty"));this.notifyDirtyChange()}getDirtyCount(){let t=0;for(const[,e]of this.trackedElements)e.isDirty&&t++;return t}}function g(){return`
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
  `}function f(){return`
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
  `}class y{constructor(){o(this,"container",null);o(this,"shadowRoot",null);o(this,"expanded",!1);o(this,"outputExpanded",!1);o(this,"editEnabled",!1);o(this,"dirtyCount",0);o(this,"saving",!1);o(this,"config",null);o(this,"callbacks",null);o(this,"output","");o(this,"phase","idle");o(this,"filesChanged",[]);o(this,"error",null)}create(t,e){if(this.container)return;this.config=t,this.callbacks=e,this.container=document.createElement("div"),this.container.id="jammin-toolbar-container",this.shadowRoot=this.container.attachShadow({mode:"closed"});const i=document.createElement("style");i.textContent=g(),this.shadowRoot.appendChild(i);const n=document.createElement("div");n.className="jammin-toolbar",n.innerHTML=this.getToolbarHTML(),this.shadowRoot.appendChild(n),document.body.appendChild(this.container),this.setupEventListeners(),this.setExpanded(!1)}destroy(){this.container&&(this.container.remove(),this.container=null,this.shadowRoot=null)}getToolbarHTML(){var t;return`
      <button class="jammin-toggle" title="Jammin CMS">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
          <path d="M2 2l7.586 7.586"></path>
          <circle cx="11" cy="11" r="2"></circle>
        </svg>
        <span class="jammin-badge" style="display: none;">0</span>
      </button>
      <div class="jammin-panel-wrapper">
        <div class="jammin-output-drawer">
          <div class="jammin-output-header">
            <div class="jammin-output-title">
              <span class="jammin-status-indicator"></span>
              <span class="jammin-status-phase">Ready</span>
            </div>
            <button class="jammin-output-close" title="Close">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="jammin-output-body">
            <pre class="jammin-output-content"></pre>
          </div>
          <div class="jammin-output-footer"></div>
        </div>
        <div class="jammin-panel">
          <div class="jammin-header">
            <span class="jammin-title">${((t=this.config)==null?void 0:t.name)||"Jammin CMS"}</span>
            <button class="jammin-close" title="Close">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="jammin-content">
            <div class="jammin-row">
              <label class="jammin-switch">
                <input type="checkbox" id="jammin-edit-toggle">
                <span class="jammin-slider"></span>
              </label>
              <span>Enable editing</span>
            </div>
            <div class="jammin-actions">
              <button class="jammin-btn jammin-btn-primary" id="jammin-save" disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                <span>Save</span>
              </button>
              <button class="jammin-btn" id="jammin-revert" disabled>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="1 4 1 10 7 10"></polyline>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                </svg>
                <span>Revert</span>
              </button>
            </div>
            <div class="jammin-divider"></div>
            <div class="jammin-actions">
              <button class="jammin-btn" id="jammin-editor">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>Open Editor</span>
              </button>
              <button class="jammin-btn" id="jammin-output-toggle">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                </svg>
                <span>Output</span>
              </button>
            </div>
            <div class="jammin-status-text">
              <span id="jammin-status-message">Ready</span>
            </div>
          </div>
        </div>
      </div>
    `}setupEventListeners(){if(!this.shadowRoot)return;const t=this.shadowRoot.querySelector(".jammin-toggle");t==null||t.addEventListener("click",()=>this.setExpanded(!this.expanded));const e=this.shadowRoot.querySelector(".jammin-close");e==null||e.addEventListener("click",()=>this.setExpanded(!1));const i=this.shadowRoot.querySelector("#jammin-edit-toggle");i==null||i.addEventListener("change",()=>{var r;this.editEnabled=i.checked,(r=this.callbacks)==null||r.onToggleEdit(this.editEnabled),this.updateUI()});const n=this.shadowRoot.querySelector("#jammin-save");n==null||n.addEventListener("click",()=>{var r;!this.saving&&this.dirtyCount>0&&((r=this.callbacks)==null||r.onSave())});const a=this.shadowRoot.querySelector("#jammin-revert");a==null||a.addEventListener("click",()=>{var r;this.dirtyCount>0&&((r=this.callbacks)==null||r.onRevert())});const s=this.shadowRoot.querySelector("#jammin-editor");s==null||s.addEventListener("click",()=>{var r;(r=this.callbacks)==null||r.onOpenEditor()});const d=this.shadowRoot.querySelector("#jammin-output-toggle");d==null||d.addEventListener("click",()=>{this.setOutputExpanded(!this.outputExpanded)});const c=this.shadowRoot.querySelector(".jammin-output-close");c==null||c.addEventListener("click",()=>{this.setOutputExpanded(!1)})}setExpanded(t){var n,a;this.expanded=t;const e=(n=this.shadowRoot)==null?void 0:n.querySelector(".jammin-panel-wrapper"),i=(a=this.shadowRoot)==null?void 0:a.querySelector(".jammin-toggle");t?(e==null||e.classList.add("expanded"),i==null||i.classList.add("hidden")):(e==null||e.classList.remove("expanded"),i==null||i.classList.remove("hidden"),this.setOutputExpanded(!1))}setOutputExpanded(t){var i;this.outputExpanded=t;const e=(i=this.shadowRoot)==null?void 0:i.querySelector(".jammin-output-drawer");t?e==null||e.classList.add("expanded"):e==null||e.classList.remove("expanded")}updateDirtyCount(t){this.dirtyCount=t,this.updateUI()}setSaving(t){this.saving=t,this.updateUI()}setStatus(t){var i;const e=(i=this.shadowRoot)==null?void 0:i.querySelector("#jammin-status-message");e&&(e.textContent=t)}updateUI(){if(!this.shadowRoot)return;const t=this.shadowRoot.querySelector(".jammin-badge");t&&(t.style.display=this.dirtyCount>0?"flex":"none",t.textContent=String(this.dirtyCount));const e=this.shadowRoot.querySelector("#jammin-save");if(e){e.disabled=this.dirtyCount===0||this.saving;const a=e.querySelector("span");a&&(a.textContent=this.saving?"Saving...":"Save")}const i=this.shadowRoot.querySelector("#jammin-revert");i&&(i.disabled=this.dirtyCount===0||this.saving);const n=this.shadowRoot.querySelector("#jammin-edit-toggle");n&&n.checked!==this.editEnabled&&(n.checked=this.editEnabled),this.updateOutputUI()}updateOutputUI(){if(!this.shadowRoot)return;const t=this.shadowRoot.querySelector(".jammin-status-indicator"),e=this.shadowRoot.querySelector(".jammin-status-phase");if(t&&(t.className="jammin-status-indicator",this.phase!=="idle"&&t.classList.add(`phase-${this.phase}`),this.error&&t.classList.add("phase-error")),e)if(this.error)e.textContent="Error";else switch(this.phase){case"idle":e.textContent="Ready";break;case"thinking":e.textContent="Thinking...";break;case"editing":e.textContent="Editing files...";break;case"complete":e.textContent="Complete";break}const i=this.shadowRoot.querySelector(".jammin-output-content");if(i){const s=this.output.replace(/\x1b\[[0-9;]*m/g,"").replace(/\r/g,"");i.textContent=s||"Waiting for output..."}const n=this.shadowRoot.querySelector(".jammin-output-footer");n&&(this.filesChanged.length>0?n.innerHTML=`
          <div class="jammin-files-header">Files modified:</div>
          <ul class="jammin-files-list">
            ${this.filesChanged.map(s=>`<li>${this.escapeHtml(s)}</li>`).join("")}
          </ul>
        `:this.error?n.innerHTML=`<div class="jammin-error">${this.escapeHtml(this.error)}</div>`:n.innerHTML="");const a=this.shadowRoot.querySelector(".jammin-output-body");a&&(a.scrollTop=a.scrollHeight)}setEditEnabled(t){this.editEnabled=t,this.updateUI()}resetOutput(){this.output="",this.phase="thinking",this.filesChanged=[],this.error=null,this.updateOutputUI()}addProgress(t){this.output+=t.output,this.phase=t.phase,this.updateOutputUI()}setComplete(t){this.phase="complete",this.filesChanged=t.filesChanged||[],this.error=t.error||null,this.updateOutputUI()}showOutput(){this.setOutputExpanded(!0)}hideOutput(){this.setOutputExpanded(!1)}toggleOutput(){this.setOutputExpanded(!this.outputExpanded)}escapeHtml(t){const e=document.createElement("div");return e.textContent=t,e.innerHTML}}class v{constructor(){o(this,"config",null);o(this,"editor",null);o(this,"toolbar",null);o(this,"currentJobId",null);o(this,"styleElement",null);o(this,"activated",!1);o(this,"pendingChanges",null);chrome.runtime.onMessage.addListener((t,e,i)=>t.action==="activate_cms"?(this.activate().then(()=>{i({success:!0,activated:this.activated})}),!0):t.action==="cms_status"?(i({activated:this.activated}),!1):(this.activated&&this.handleBackgroundMessage(t),!1))}async activate(){if(this.activated)return;const t=await this.getConfigForCurrentPage();if(!t){console.log("[Jammin] No matching config for this page");return}this.config=t,this.activated=!0,console.log("[Jammin] Activated for:",t.name),this.editor=new b,this.toolbar=new y,this.injectPageStyles(),this.editor.setConfig(t),this.editor.setDirtyChangeHandler(()=>{var e,i;(i=this.toolbar)==null||i.updateDirtyCount(((e=this.editor)==null?void 0:e.getDirtyCount())||0)}),this.toolbar.create(t,{onSave:()=>this.handleSave(),onRevert:()=>this.handleRevert(),onToggleEdit:e=>this.handleToggleEdit(e),onOpenEditor:()=>this.handleOpenEditor()}),document.addEventListener("jammin:save",()=>this.handleSave())}async getConfigForCurrentPage(){return new Promise(t=>{chrome.runtime.sendMessage({action:"get_site_config",payload:{url:window.location.href}},e=>{t(e==null?void 0:e.payload)})})}injectPageStyles(){this.styleElement=document.createElement("style"),this.styleElement.id="jammin-page-styles",this.styleElement.textContent=f(),document.head.appendChild(this.styleElement)}handleToggleEdit(t){!this.editor||!this.toolbar||(t?(this.editor.enable(),document.body.classList.add("jammin-editing-active")):(this.editor.disable(),document.body.classList.remove("jammin-editing-active")),this.toolbar.setEditEnabled(t))}async handleSave(){if(!this.config||!this.editor||!this.toolbar||!this.editor.hasDirtyElements())return;const t=this.editor.getDirtyChanges();t.length!==0&&(this.toolbar.setSaving(!0),this.toolbar.setStatus("Checking project..."),this.toolbar.resetOutput(),this.toolbar.showOutput(),this.pendingChanges={projectPath:this.config.localPath,siteUrl:window.location.href,changes:t,customInstructions:this.config.customInstructions},chrome.runtime.sendMessage({action:"submit_changes",payload:this.pendingChanges},e=>{var i,n,a;(e==null?void 0:e.action)==="job_accepted"?(this.currentJobId=e.payload.jobId,(i=this.toolbar)==null||i.setStatus("Claude is working...")):(e==null?void 0:e.action)==="error"&&((n=this.toolbar)==null||n.setSaving(!1),(a=this.toolbar)==null||a.setStatus("Error: "+e.payload.message),this.pendingChanges=null)}))}handleRevert(){!this.editor||!this.toolbar||(this.editor.revertAll(),this.toolbar.setStatus("Changes reverted"))}handleOpenEditor(){this.config&&chrome.runtime.sendMessage({action:"open_editor",payload:{projectPath:this.config.localPath}})}handleBackgroundMessage(t){var e;if(!(!this.toolbar||!this.editor))switch(t.action){case"job_progress":{const i=t.payload;i.jobId===this.currentJobId&&(this.toolbar.addProgress(i),this.toolbar.setStatus(i.phase==="editing"?"Editing files...":"Claude is thinking..."));break}case"job_complete":{const i=t.payload;if(i.jobId===this.currentJobId){if(this.toolbar.setComplete(i),this.toolbar.setSaving(!1),i.success){this.editor.markSaved();const n=((e=i.filesChanged)==null?void 0:e.length)||0;this.toolbar.setStatus(`Done! ${n} file${n!==1?"s":""} modified`)}else this.toolbar.setStatus("Error: "+(i.error||"Unknown error"));this.currentJobId=null}break}case"job_cancelled":{t.payload.jobId===this.currentJobId&&(this.toolbar.setSaving(!1),this.toolbar.setStatus("Cancelled"),this.currentJobId=null);break}case"git_dirty":{const i=t.payload;i.jobId===this.currentJobId&&this.handleGitDirty(i);break}case"error":{this.toolbar.setSaving(!1),this.toolbar.setStatus("Error: "+t.payload.message);break}}}handleGitDirty(t){if(!this.toolbar)return;const e=t.changedFiles.length,i=t.changedFiles.slice(0,5).join(`
  `),n=e>5?`
  ... and ${e-5} more`:"";confirm(`This project has ${e} uncommitted change${e!==1?"s":""}:
  ${i}${n}

Do you want to proceed anyway?`)&&this.pendingChanges?chrome.runtime.sendMessage({action:"submit_changes_force",payload:this.pendingChanges},s=>{var d,c,r;(s==null?void 0:s.action)==="job_accepted"?(this.currentJobId=s.payload.jobId,(d=this.toolbar)==null||d.setStatus("Claude is working...")):(s==null?void 0:s.action)==="error"&&((c=this.toolbar)==null||c.setSaving(!1),(r=this.toolbar)==null||r.setStatus("Error: "+s.payload.message))}):(this.toolbar.setSaving(!1),this.toolbar.setStatus("Cancelled - uncommitted changes"),this.currentJobId=null),this.pendingChanges=null}}new v;
