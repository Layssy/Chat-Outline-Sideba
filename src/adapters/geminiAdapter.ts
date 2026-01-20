import type { ConversationNode, IAdapter } from '../bridge/adapter';

type UpdateCallback = (nodes: ConversationNode[]) => void;

type SelectorSet = {
  user: string;
  assistant: string;
  summary: string;
};

export class GeminiAdapter implements IAdapter {
  private callbacks: UpdateCallback[] = [];
  private observer: MutationObserver | null = null;
  private foldedState = new Map<string, boolean>();
  private selectorSets: SelectorSet[] = [
    {
      user: 'user-query',
      assistant: 'model-response',
      summary: '.query-text'
    },
    {
      user: '[data-test-id="user-message"], [data-test-id="user-query"]',
      assistant: '[data-test-id="model-response"]',
      summary: '.query-text'
    },
    {
      user: '[data-test-id*="user"], user-query',
      assistant: '[data-test-id*="model"], model-response',
      summary: '.query-text'
    },
    {
      user: '[data-message-author-role="user"], [data-turn="user"]',
      assistant: '[data-message-author-role="assistant"], [data-turn="assistant"]',
      summary: '.query-text'
    },
    {
      user: '.question-wrapper, .question-block',
      assistant: 'ucs-summary, .turn ucs-summary',
      summary: 'ucs-fast-markdown, .question-wrapper, .question-block, .markdown-document'
    }
  ];

  init(): void {
    this.observe();
  }

  onUpdate(callback: UpdateCallback): void {
    this.callbacks.push(callback);
  }

  getNodes(): ConversationNode[] {
    const nodes: ConversationNode[] = [];
    const turnPairs = this.collectTurnPairs();

    if (turnPairs.length) {
      for (let index = 0; index < turnPairs.length; index += 1) {
        const { userElement, aiElement, turnElement } = turnPairs[index];
        const summary = this.extractSummary(userElement);
        const id = this.buildTurnId(index, userElement, turnElement);
        const isFolded = this.foldedState.get(id) ?? false;

        this.ensureFoldButton(userElement, id);
        this.ensureFoldButton(aiElement, id);

        nodes.push({
          id,
          role: 'user',
          summary,
          userElement,
          aiElement,
          isFolded
        });
      }

      return nodes;
    }

    const containers = this.collectMessageContainers();

    const userElements = containers.filter((container) => this.matchesRole(container, 'user'));
    const assistantElements = containers.filter((container) =>
      this.matchesRole(container, 'assistant')
    );

    const maxLength = Math.min(userElements.length, assistantElements.length);

    for (let index = 0; index < maxLength; index += 1) {
      const userElement = userElements[index] as HTMLElement | undefined;
      const aiElement = assistantElements[index] as HTMLElement | undefined;
      if (!userElement || !aiElement) {
        continue;
      }

      const summary = this.extractSummary(userElement);
      const id = this.buildTurnId(index, userElement);
      const isFolded = this.foldedState.get(id) ?? false;

      this.ensureFoldButton(userElement, id);
      this.ensureFoldButton(aiElement, id);

      nodes.push({
        id,
        role: 'user',
        summary,
        userElement,
        aiElement,
        isFolded
      });
    }

    return nodes;
  }

  scrollTo(id: string): void {
    const nodes = this.getNodes();
    const target = nodes.find((node) => node.id === id);
    target?.userElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  toggleFold(id: string, isFolded: boolean): void {
    this.foldedState.set(id, isFolded);
    const nodes = this.getNodes();
    const target = nodes.find((node) => node.id === id);
    if (!target) {
      return;
    }

    this.applyFoldState(target.aiElement, isFolded);
  }

  private extractSummary(userElement: HTMLElement): string {
    const fastMarkdown = userElement.querySelector<HTMLElement>('ucs-fast-markdown');
    if (fastMarkdown?.shadowRoot) {
      const doc = fastMarkdown.shadowRoot.querySelector<HTMLElement>('.markdown-document');
      if (doc?.textContent?.trim()) {
        return doc.textContent.trim().slice(0, 80);
      }
    }

    for (const set of this.selectorSets) {
      const candidate = userElement.querySelector(set.summary);
      if (candidate?.textContent?.trim()) {
        return candidate.textContent.trim().slice(0, 80);
      }
    }

    if (fastMarkdown?.textContent?.trim()) {
      return fastMarkdown.textContent.trim().slice(0, 80);
    }

    return userElement.textContent?.trim().slice(0, 80) || 'User prompt';
  }

  private matchesRole(element: HTMLElement, role: 'user' | 'assistant'): boolean {
    return this.selectorSets.some((set) => {
      const selector = role === 'user' ? set.user : set.assistant;
      return selector
        .split(',')
        .map((part) => part.trim())
        .some((part) => (part ? element.matches(part) : false));
    });
  }

  private collectTurnPairs(): Array<{
    userElement: HTMLElement;
    aiElement: HTMLElement;
    turnElement?: HTMLElement;
  }> {
    const pairs: Array<{ userElement: HTMLElement; aiElement: HTMLElement; turnElement?: HTMLElement }> = [];
    const turns = this.collectTurnElements();

    turns.forEach((turn) => {
      const question = turn.querySelector<HTMLElement>('.question-wrapper, .question-block');
      const summary = turn.querySelector<HTMLElement>('ucs-summary');
      if (question && summary) {
        pairs.push({ userElement: question, aiElement: summary, turnElement: turn });
      }
    });

    return pairs;
  }

  private collectTurnElements(): HTMLElement[] {
    const collected = new Set<HTMLElement>();

    const ucsConversations = Array.from(document.querySelectorAll<HTMLElement>('ucs-conversation'));
    ucsConversations.forEach((conversation) => {
      const root = conversation.shadowRoot;
      if (!root) {
        return;
      }
      const main = root.querySelector<HTMLElement>('.main') ?? root;
      main.querySelectorAll<HTMLElement>('.turn').forEach((turn) => collected.add(turn));
    });

    document.querySelectorAll<HTMLElement>('.turn').forEach((turn) => collected.add(turn));

    return Array.from(collected);
  }

  private buildTurnId(index: number, userElement: HTMLElement, turnElement?: HTMLElement): string {
    const queryIndex =
      userElement.getAttribute('data-query-index') ??
      turnElement?.getAttribute('data-query-index');

    if (queryIndex) {
      return `gemini-q-${queryIndex}`;
    }

    const markdown = userElement.querySelector<HTMLElement>('ucs-fast-markdown');
    const turnIndex =
      markdown?.getAttribute('data-turn-index') ??
      turnElement?.getAttribute('data-turn-index');

    if (turnIndex) {
      return `gemini-t-${turnIndex}`;
    }

    return `gemini-${index}`;
  }

  private collectMessageContainers(): HTMLElement[] {
    const containers: HTMLElement[] = [];
    const selectors = this.selectorSets
      .flatMap((set) => [set.user, set.assistant])
      .join(', ');

    const mainContainers = document.querySelectorAll<HTMLElement>(selectors);
    mainContainers.forEach((node) => containers.push(node));

    document.querySelectorAll<HTMLElement>('*').forEach((host) => {
      const shadow = host.shadowRoot;
      if (!shadow) {
        return;
      }
      shadow.querySelectorAll<HTMLElement>(selectors).forEach((node) => containers.push(node));
    });

    return containers;
  }

  private observe(): void {
    if (this.observer) {
      return;
    }

    this.observer = new MutationObserver(() => {
      const nodes = this.getNodes();
      nodes.forEach((node) => this.applyFoldState(node.aiElement, node.isFolded));
      this.callbacks.forEach((callback) => callback(nodes));
    });

    this.observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }

  private ensureFoldButton(target: HTMLElement, id: string): void {
    if (target.querySelector('.oa-fold-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'oa-fold-btn';
    button.setAttribute('aria-label', 'Toggle fold');
    button.setAttribute('aria-expanded', 'true');
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const next = !(this.foldedState.get(id) ?? false);
      this.toggleFold(id, next);
    });

    target.prepend(button);
  }

  private applyFoldState(element: HTMLElement, isFolded: boolean): void {
    const foldTarget = this.resolveFoldTarget(element);

    foldTarget.style.maxHeight = isFolded ? '40px' : '';
    foldTarget.style.overflow = isFolded ? 'hidden' : '';
    foldTarget.style.position = isFolded ? 'relative' : '';

    const placeholderId = 'oa-fold-placeholder';
    let placeholder = foldTarget.querySelector<HTMLElement>(`#${placeholderId}`);

    if (isFolded) {
      if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.id = placeholderId;
        placeholder.textContent = 'AI Response (Click to expand)';
        placeholder.style.position = 'absolute';
        placeholder.style.left = '0';
        placeholder.style.right = '0';
        placeholder.style.bottom = '0';
        placeholder.style.height = '40px';
        placeholder.style.display = 'flex';
        placeholder.style.alignItems = 'center';
        placeholder.style.justifyContent = 'center';
        placeholder.style.background = 'rgba(0,0,0,0.06)';
        placeholder.style.fontSize = '12px';
        placeholder.style.color = '#555';
        placeholder.style.pointerEvents = 'none';
        foldTarget.appendChild(placeholder);
      }
    } else if (placeholder) {
      placeholder.remove();
    }

    const toggle = element.querySelector<HTMLButtonElement>('button.oa-fold-btn');
    if (toggle) {
      if (isFolded) {
        toggle.classList.add('oa-folded');
        toggle.setAttribute('aria-expanded', 'false');
      } else {
        toggle.classList.remove('oa-folded');
        toggle.setAttribute('aria-expanded', 'true');
      }
    }
  }

  private resolveFoldTarget(element: HTMLElement): HTMLElement {
    if (element.shadowRoot) {
      const markdown = element.shadowRoot.querySelector<HTMLElement>('.markdown-document');
      if (markdown) {
        return markdown;
      }
    }

    const directMarkdown = element.querySelector<HTMLElement>('.markdown-document');
    if (directMarkdown) {
      return directMarkdown;
    }

    return element;
  }
}
