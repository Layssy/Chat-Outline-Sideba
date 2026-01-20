import type { ConversationNode, IAdapter } from '../bridge/adapter';

type UpdateCallback = (nodes: ConversationNode[]) => void;

export class ChatGPTAdapter implements IAdapter {
  private callbacks: UpdateCallback[] = [];
  private observer: MutationObserver | null = null;
  private foldedState = new Map<string, boolean>();

  init(): void {
    this.observe();
  }

  onUpdate(callback: UpdateCallback): void {
    this.callbacks.push(callback);
  }

  getNodes(): ConversationNode[] {
    const userArticles = Array.from(
      document.querySelectorAll('article [data-message-author-role="user"]')
    ).map((node) => node.closest('article'));

    const assistantArticles = Array.from(
      document.querySelectorAll('article [data-message-author-role="assistant"]')
    ).map((node) => node.closest('article'));

    const nodes: ConversationNode[] = [];
    const maxLength = Math.min(userArticles.length, assistantArticles.length);

    for (let index = 0; index < maxLength; index += 1) {
      const userArticle = userArticles[index];
      const assistantArticle = assistantArticles[index];
      if (!userArticle || !assistantArticle) {
        continue;
      }

      const userContent =
        userArticle.querySelector('[data-message-author-role="user"]') ?? userArticle;
      const assistantContent =
        assistantArticle.querySelector('[data-message-author-role="assistant"]') ??
        assistantArticle;

      this.ensureFoldButton(userContent as HTMLElement, `chatgpt-${index}`);
      this.ensureFoldButton(assistantContent as HTMLElement, `chatgpt-${index}`);

      const summarySource = userContent.textContent?.trim() ?? '';
      const summary = summarySource.split('\n').find(Boolean)?.slice(0, 80) ?? 'User prompt';

      const id = `chatgpt-${index}`;
      const isFolded = this.foldedState.get(id) ?? false;

      nodes.push({
        id,
        role: 'user',
        summary,
        userElement: userContent as HTMLElement,
        aiElement: assistantContent as HTMLElement,
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
    element.style.maxHeight = isFolded ? '40px' : '';
    element.style.overflow = isFolded ? 'hidden' : '';
    element.style.position = isFolded ? 'relative' : '';
    const placeholderId = 'oa-fold-placeholder';
    let placeholder = element.querySelector<HTMLElement>(`#${placeholderId}`);

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
        element.appendChild(placeholder);
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
}
