import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import type { ConversationNode, IAdapter } from '../bridge/adapter';

type Props = {
  adapter: IAdapter;
};

export function Sidebar({ adapter }: Props) {
  const [nodes, setNodes] = useState<ConversationNode[]>([]);
  const [foldedIds, setFoldedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    adapter.onUpdate((updated) => {
      setNodes(updated);
    });
    setNodes(adapter.getNodes());
  }, [adapter]);

  const handleFoldAll = () => {
    const next = new Set(nodes.map((node) => node.id));
    next.forEach((id) => adapter.toggleFold(id, true));
    setFoldedIds(next);
  };

  const handleExpandAll = () => {
    foldedIds.forEach((id) => adapter.toggleFold(id, false));
    setFoldedIds(new Set());
  };

  const handleToggle = (id: string) => {
    const isFolded = foldedIds.has(id);
    adapter.toggleFold(id, !isFolded);
    const next = new Set(foldedIds);
    if (isFolded) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setFoldedIds(next);
  };

  return (
    <div class="oa-sidebar">
      <div class="oa-header">
        <input
          type="color"
          class="oa-color-picker"
          defaultValue="#0a0f1a"
          aria-label="Change sidebar background"
        />
        <div class="oa-actions">
          <button type="button" class="oa-btn" onClick={handleFoldAll}>
            Fold All Answers
          </button>
          <button type="button" class="oa-btn" onClick={handleExpandAll}>
            Expand All
          </button>
        </div>
      </div>
      <div class="oa-list">
        {nodes.map((node) => (
          <div key={node.id} class="oa-item">
            <button
              type="button"
              class="oa-link"
              onClick={() => adapter.scrollTo(node.id)}
            >
              {node.summary}
            </button>
            <button
              type="button"
              class="oa-toggle"
              onClick={() => handleToggle(node.id)}
            >
              {foldedIds.has(node.id) ? 'Expand' : 'Fold'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
