export type ConversationRole = 'user' | 'ai';

export interface ConversationNode {
  id: string;
  role: ConversationRole;
  summary: string;
  userElement: HTMLElement;
  aiElement: HTMLElement;
  isFolded: boolean;
}

export interface IAdapter {
  init(): void;
  getNodes(): ConversationNode[];
  scrollTo(id: string): void;
  toggleFold(id: string, isFolded: boolean): void;
  onUpdate(callback: (nodes: ConversationNode[]) => void): void;
}
