declare module 'bootstrap' {
  export class Modal {
    constructor(element: Element, options?: Record<string, unknown>);
    show(): void;
    hide(): void;
    toggle(): void;
    dispose(): void;
    static getInstance(element: Element): Modal | null;
  }
}
