import type { TrackedElement, EditChange, SiteConfig } from '../shared/types';

// Generate a unique CSS selector for an element
function generateSelector(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    // Add ID if present
    if (current.id) {
      selector = `#${current.id}`;
      path.unshift(selector);
      break; // ID is unique, stop here
    }

    // Add classes
    if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('jammin-'))
        .slice(0, 2);
      if (classes.length > 0) {
        selector += `.${classes.join('.')}`;
      }
    }

    // Add nth-child if needed for uniqueness
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(
        (c) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}

// Generate a human-readable element path
function generateElementPath(element: HTMLElement): string {
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let descriptor = current.tagName.toLowerCase();

    // Add meaningful attributes
    if (current.id) {
      descriptor += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className
        .split(/\s+/)
        .filter((c) => c && !c.startsWith('jammin-'))
        .slice(0, 2);
      if (classes.length > 0) {
        descriptor += `.${classes.join('.')}`;
      }
    }

    path.unshift(descriptor);
    current = current.parentElement;

    // Limit path depth
    if (path.length >= 4) break;
  }

  return path.join(' > ');
}

export class InlineEditor {
  private trackedElements = new Map<HTMLElement, TrackedElement>();
  private config: SiteConfig | null = null;
  private mutationObserver: MutationObserver | null = null;
  private enabled = false;
  private onDirtyChange: ((hasDirty: boolean) => void) | null = null;

  constructor() {
    // Bind methods
    this.handleInput = this.handleInput.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  public setConfig(config: SiteConfig): void {
    this.config = config;
  }

  public setDirtyChangeHandler(handler: (hasDirty: boolean) => void): void {
    this.onDirtyChange = handler;
  }

  public enable(): void {
    if (this.enabled || !this.config) return;

    this.enabled = true;
    this.setupEditableElements();
    this.startObserving();
    document.addEventListener('keydown', this.handleKeydown);
  }

  public disable(): void {
    if (!this.enabled) return;

    this.enabled = false;
    this.stopObserving();
    this.removeAllEditable();
    document.removeEventListener('keydown', this.handleKeydown);
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private setupEditableElements(): void {
    if (!this.config) return;

    for (const selector of this.config.editableSelectors) {
      const elements = document.querySelectorAll<HTMLElement>(selector);
      elements.forEach((el) => this.makeEditable(el));
    }
  }

  private makeEditable(element: HTMLElement): void {
    if (this.trackedElements.has(element)) return;

    // Make editable
    element.contentEditable = 'true';
    element.classList.add('jammin-editable');

    // Store original state
    const tracked: TrackedElement = {
      element,
      originalContent: element.innerHTML,
      selector: generateSelector(element),
      elementPath: generateElementPath(element),
      isDirty: false,
    };

    this.trackedElements.set(element, tracked);

    // Listen for changes
    element.addEventListener('input', this.handleInput);
  }

  private removeEditable(element: HTMLElement): void {
    const tracked = this.trackedElements.get(element);
    if (!tracked) return;

    element.contentEditable = 'false';
    element.classList.remove('jammin-editable', 'jammin-dirty');
    element.removeEventListener('input', this.handleInput);

    this.trackedElements.delete(element);
  }

  private removeAllEditable(): void {
    for (const [element] of this.trackedElements) {
      this.removeEditable(element);
    }
  }

  private handleInput(event: Event): void {
    const element = event.target as HTMLElement;
    const tracked = this.trackedElements.get(element);
    if (!tracked) return;

    const currentContent = element.innerHTML;
    const isDirty = currentContent !== tracked.originalContent;

    if (isDirty !== tracked.isDirty) {
      tracked.isDirty = isDirty;
      element.classList.toggle('jammin-dirty', isDirty);
      this.notifyDirtyChange();
    }
  }

  private handleKeydown(event: KeyboardEvent): void {
    // Cmd/Ctrl+S to save
    if ((event.metaKey || event.ctrlKey) && event.key === 's') {
      if (this.hasDirtyElements()) {
        event.preventDefault();
        // Dispatch custom event for toolbar to handle
        document.dispatchEvent(new CustomEvent('jammin:save'));
      }
    }

    // Escape to cancel editing on focused element
    if (event.key === 'Escape') {
      const active = document.activeElement as HTMLElement;
      if (active && this.trackedElements.has(active)) {
        this.revertElement(active);
        active.blur();
      }
    }
  }

  private startObserving(): void {
    if (this.mutationObserver) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Handle new nodes
        for (const node of mutation.addedNodes) {
          if (node instanceof HTMLElement) {
            this.checkNewElement(node);
          }
        }
      }
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private stopObserving(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  private checkNewElement(element: HTMLElement): void {
    if (!this.config) return;

    for (const selector of this.config.editableSelectors) {
      if (element.matches(selector)) {
        this.makeEditable(element);
      }
      // Also check descendants
      element.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        this.makeEditable(el);
      });
    }
  }

  private notifyDirtyChange(): void {
    if (this.onDirtyChange) {
      this.onDirtyChange(this.hasDirtyElements());
    }
  }

  public hasDirtyElements(): boolean {
    for (const [, tracked] of this.trackedElements) {
      if (tracked.isDirty) return true;
    }
    return false;
  }

  public getDirtyChanges(): EditChange[] {
    const changes: EditChange[] = [];

    for (const [element, tracked] of this.trackedElements) {
      if (tracked.isDirty) {
        changes.push({
          elementPath: tracked.elementPath,
          selector: tracked.selector,
          originalContent: tracked.originalContent,
          newContent: element.innerHTML,
        });
      }
    }

    return changes;
  }

  public revertElement(element: HTMLElement): void {
    const tracked = this.trackedElements.get(element);
    if (!tracked) return;

    element.innerHTML = tracked.originalContent;
    tracked.isDirty = false;
    element.classList.remove('jammin-dirty');
    this.notifyDirtyChange();
  }

  public revertAll(): void {
    for (const [element, tracked] of this.trackedElements) {
      if (tracked.isDirty) {
        element.innerHTML = tracked.originalContent;
        tracked.isDirty = false;
        element.classList.remove('jammin-dirty');
      }
    }
    this.notifyDirtyChange();
  }

  public markSaved(): void {
    // Update original content to current content after successful save
    for (const [element, tracked] of this.trackedElements) {
      if (tracked.isDirty) {
        tracked.originalContent = element.innerHTML;
        tracked.isDirty = false;
        element.classList.remove('jammin-dirty');
      }
    }
    this.notifyDirtyChange();
  }

  public getDirtyCount(): number {
    let count = 0;
    for (const [, tracked] of this.trackedElements) {
      if (tracked.isDirty) count++;
    }
    return count;
  }
}
