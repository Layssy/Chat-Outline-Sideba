import { h, render } from 'preact';
import { ChatGPTAdapter } from '../adapters/chatgptAdapter';
import { GeminiAdapter } from '../adapters/geminiAdapter';
import type { IAdapter } from '../bridge/adapter';
import { Sidebar } from '../ui/sidebar';

const collapseKey = 'oa-sidebar-collapsed';
const positionKey = 'oa-sidebar-top';
const colorKey = 'oa-sidebar-color';
const widthKey = 'oa-sidebar-width';
const heightKey = 'oa-sidebar-height';
const defaultColor = '#0a0f1a';

const setCollapsed = (
  sidebar: HTMLElement | null,
  collapsed: boolean
) => {
  if (sidebar) {
    if (collapsed) {
      sidebar.classList.add('oa-collapsed');
    } else {
      sidebar.classList.remove('oa-collapsed');
    }
  }
  window.localStorage.setItem(collapseKey, collapsed ? '1' : '0');
};

const isCollapsed = () => window.localStorage.getItem(collapseKey) === '1';

const getStoredTop = () => {
  const raw = window.localStorage.getItem(positionKey);
  if (!raw) {
    return 80;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 80;
};

const getStoredColor = () =>
  window.localStorage.getItem(colorKey) ?? defaultColor;

const getStoredSize = (key: string) => {
  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
};

const applySidebarWidth = (sidebar: HTMLElement | null, width: number) => {
  if (!sidebar) {
    return;
  }
  sidebar.style.setProperty('--oa-sidebar-width', `${width}px`);
};

const applySidebarHeight = (sidebar: HTMLElement | null, height: number) => {
  if (!sidebar) {
    return;
  }
  sidebar.style.setProperty('--oa-sidebar-height', `${height}px`);
};

const applySidebarColor = (sidebar: HTMLElement | null, color: string) => {
  if (sidebar) {
    sidebar.style.background = color;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const applyTop = (element: HTMLElement | null, top: number) => {
  if (element) {
    element.style.top = `${top}px`;
  }
};

type AdapterFactory = () => IAdapter;

type AdapterMatch = {
  match: (location: Location) => boolean;
  create: AdapterFactory;
};

const adapters: AdapterMatch[] = [
  {
    match: (location) => location.hostname.includes('chatgpt.com'),
    create: () => new ChatGPTAdapter()
  },
  {
    match: (location) =>
      location.hostname.includes('gemini.google.com') ||
      location.hostname.includes('business.gemini.google'),
    create: () => new GeminiAdapter()
  }
];

const adapterMatch = adapters.find((entry) => entry.match(window.location));
if (!adapterMatch) {
  throw new Error('No adapter matched current host');
}

const host = document.createElement('div');
host.id = 'oa-sidebar-host';
const shadow = host.attachShadow({ mode: 'open' });
const root = document.createElement('div');
root.id = 'oa-root';
let sidebarElement: HTMLElement | null = null;

const style = document.createElement('style');
style.textContent = `
  .oa-sidebar {
    position: fixed;
    top: 80px;
    right: 16px;
    width: var(--oa-sidebar-width, 280px);
    height: var(--oa-sidebar-height, auto);
    max-height: calc(100vh - 120px);
    overflow: auto;
    background: #0a0f1a;
    border: 1px solid rgba(0, 229, 255, 0.15);
    border-radius: 12px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04), 0 0 20px rgba(0, 229, 255, 0.05);
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 14px;
    color: #e2e8f0;
    z-index: 2147483647;
    transition: width 0.2s ease, padding 0.2s ease, top 0.15s ease, background 0.3s ease;
  }
  .oa-sidebar.oa-resizing {
    transition: none;
  }
  .oa-sidebar.oa-collapsed {
    width: 40px;
    padding: 6px 4px;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 20px rgba(0, 229, 255, 0.05);
  }
  .oa-sidebar.oa-collapsed .oa-resize-handle {
    display: none;
  }
  .oa-resize-handle {
    position: absolute;
    z-index: 2147483647;
    background: transparent;
    touch-action: none;
    user-select: none;
  }
  .oa-resize-handle:hover {
    background: rgba(0, 229, 255, 0.08);
  }
  .oa-resize-handle-ew {
    top: 0;
    right: -12px;
    width: 12px;
    height: 100%;
    cursor: ew-resize;
    border-radius: 0 12px 12px 0;
  }
  .oa-resize-handle-se {
    right: 0;
    bottom: 0;
    width: 28px;
    height: 28px;
    cursor: nwse-resize;
    border-radius: 0 0 12px 0;
  }
  .oa-resize-handle-se::after {
    content: '';
    position: absolute;
    right: 7px;
    bottom: 7px;
    width: 10px;
    height: 10px;
    border-right: 2px solid rgba(0, 229, 255, 0.35);
    border-bottom: 2px solid rgba(0, 229, 255, 0.35);
    border-radius: 0 0 2px 0;
    pointer-events: none;
  }
  .oa-resize-handle-se:hover::after {
    border-right-color: rgba(0, 229, 255, 0.8);
    border-bottom-color: rgba(0, 229, 255, 0.8);
  }
  .oa-header {
    padding: 12px 14px 10px;
    border-bottom: 1px solid rgba(0, 229, 255, 0.12);
    position: sticky;
    top: 0;
    z-index: 10;
    background: inherit;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    cursor: grab;
  }
  .oa-header.oa-dragging {
    cursor: grabbing;
  }
  .oa-sidebar.oa-collapsed .oa-header {
    justify-content: center;
    padding: 10px;
    border-bottom: none;
  }
  .oa-sidebar.oa-collapsed .oa-color-picker {
    display: none;
  }
  .oa-sidebar.oa-collapsed .oa-title,
  .oa-sidebar.oa-collapsed .oa-actions,
  .oa-sidebar.oa-collapsed .oa-list {
    display: none;
  }
  .oa-sidebar.oa-collapsed {
    overflow: visible;
  }
  .oa-collapse-btn {
    border: none;
    background: transparent;
    color: rgba(0, 229, 255, 0.4);
    cursor: pointer;
    width: 20px;
    height: 20px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .oa-collapse-btn:hover {
    background: rgba(0, 229, 255, 0.08);
    color: rgba(0, 229, 255, 0.8);
  }
  .oa-collapse-btn:focus {
    outline: none;
    background: rgba(0, 229, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.15);
  }
  .oa-collapse-btn::after {
    content: '';
    width: 7px;
    height: 7px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    margin-left: 1px;
  }
  .oa-sidebar.oa-collapsed .oa-collapse-btn {
    width: 28px;
    height: 28px;
    background: rgba(0, 229, 255, 0.05);
    color: rgba(0, 229, 255, 0.5);
  }
  .oa-sidebar.oa-collapsed .oa-collapse-btn:hover {
    background: rgba(0, 229, 255, 0.1);
    color: rgba(0, 229, 255, 0.9);
  }
  .oa-sidebar.oa-collapsed .oa-collapse-btn::after {
    transform: rotate(135deg);
    margin-left: 0;
    margin-right: 1px;
  }
  .oa-title {
    font-weight: 600;
    font-size: 14px;
    margin: 0 0 10px 0;
    letter-spacing: -0.01em;
    color: #f0f4f8;
  }
  .oa-color-picker {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(0, 229, 255, 0.4);
    border-radius: 999px;
    background: transparent;
    cursor: pointer;
    padding: 0;
    margin-right: auto;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    appearance: none;
    -webkit-appearance: none;
  }
  .oa-color-picker::-webkit-color-swatch-wrapper {
    padding: 0;
  }
  .oa-color-picker::-webkit-color-swatch {
    border: none;
    border-radius: 999px;
  }
  .oa-color-picker::-moz-color-swatch {
    border: none;
    border-radius: 999px;
  }
  .oa-color-picker:hover {
    border-color: rgba(0, 229, 255, 0.8);
    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.1);
    transform: scale(1.1);
  }
  .oa-color-picker:focus {
    outline: none;
    border-color: rgba(0, 229, 255, 1);
    box-shadow: 0 0 0 3px rgba(0, 229, 255, 0.15);
  }
  .oa-actions {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    margin-right: auto;
  }
  .oa-btn {
    background: transparent;
    color: rgba(226, 232, 240, 0.7);
    border: none;
    border-radius: 999px;
    padding: 5px 10px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    letter-spacing: 0.01em;
  }
  .oa-btn:hover {
    background: rgba(0, 229, 255, 0.08);
    color: rgba(0, 229, 255, 0.9);
  }
  .oa-btn:focus {
    outline: none;
    background: rgba(0, 229, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.15);
  }
  .oa-btn:active {
    background: rgba(0, 229, 255, 0.12);
  }
  .oa-list {
    padding: 8px 10px 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .oa-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .oa-link {
    text-align: left;
    border: none;
    background: transparent;
    color: #38bdf8;
    cursor: pointer;
    font-size: 13px;
    padding: 0;
    font-weight: 500;
    transition: color 0.2s ease;
    line-height: 1.4;
  }
  .oa-link:hover {
    color: #7dd3fc;
    text-decoration: underline;
  }
  .oa-link:focus {
    outline: none;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-decoration-offset: 2px;
  }
  .oa-toggle {
    align-self: flex-start;
    border: 1px solid rgba(0, 229, 255, 0.15);
    background: transparent;
    border-radius: 4px;
    padding: 3px 6px;
    font-size: 10px;
    font-weight: 500;
    cursor: pointer;
    color: rgba(226, 232, 240, 0.6);
    transition: all 0.15s ease;
  }
  .oa-toggle:hover {
    background: rgba(0, 229, 255, 0.08);
    border-color: rgba(0, 229, 255, 0.25);
    color: rgba(0, 229, 255, 0.9);
  }
  .oa-toggle:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.15);
  }
`;

const pageStyle = document.createElement('style');
pageStyle.textContent = `
  .oa-fold-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    padding: 0;
    margin-left: 4px;
    transition: all 0.15s ease;
    color: rgba(226, 232, 240, 0.5);
    position: relative;
  }
  .oa-fold-btn:hover {
    background: rgba(0, 229, 255, 0.08);
    color: rgba(0, 229, 255, 0.8);
  }
  .oa-fold-btn:focus {
    outline: none;
    background: rgba(0, 229, 255, 0.08);
    box-shadow: 0 0 0 2px rgba(0, 229, 255, 0.15);
  }
  .oa-fold-btn:active {
    background: rgba(0, 229, 255, 0.12);
  }
  .oa-fold-btn::after {
    content: '';
    display: block;
    width: 7px;
    height: 7px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(-45deg);
    transition: transform 0.2s ease;
    position: relative;
    top: -1px;
  }
  .oa-fold-btn.oa-folded::after {
    transform: rotate(45deg);
  }

  /* Left Sidebar Folder Panel Styles */
  .oa-folder-panel {
    padding: 8px 12px;
    margin-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(0, 0, 0, 0.2);
    border-radius: 6px;
  }

  .oa-folder-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 4px 0;
    cursor: pointer;
    user-select: none;
  }

  .oa-folder-title {
    font-size: 12px;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .oa-folder-toggle {
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    padding: 0;
    border-radius: 3px;
    transition: all 0.15s ease;
  }

  .oa-folder-toggle:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  .oa-folder-toggle::after {
    content: '';
    width: 5px;
    height: 5px;
    border-right: 1.5px solid currentColor;
    border-bottom: 1.5px solid currentColor;
    transform: rotate(45deg);
    transition: transform 0.2s ease;
  }

  .oa-folder-panel.oa-collapsed .oa-folder-toggle::after {
    transform: rotate(-135deg);
  }

  .oa-folder-content {
    display: block;
    padding-top: 6px;
    transition: all 0.2s ease;
  }

  .oa-folder-panel.oa-collapsed .oa-folder-content {
    display: none;
  }

  .oa-folder-tree {
    padding-left: 4px;
  }

  .oa-folder-item {
    display: flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
    gap: 6px;
  }

  .oa-folder-item:hover {
    background: rgba(255, 255, 255, 0.06);
    color: rgba(255, 255, 255, 0.9);
  }

  .oa-folder-item.active {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  .oa-folder-item::before {
    content: '';
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0.6;
  }



  .oa-folder-menu {
    position: fixed;
    min-width: 160px;
    max-height: 240px;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #1e1e1e;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    padding: 4px 0;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    display: none;
  }

  .oa-folder-menu.show {
    display: block;
  }

  .oa-folder-menu-item {
    display: block;
    width: 100%;
    padding: 6px 12px;
    text-align: left;
    border: none;
    background: transparent;
    color: rgba(255, 255, 255, 0.8);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s ease;
  }

  .oa-folder-menu-item:hover {
    background: rgba(255, 255, 255, 0.08);
    color: rgba(255, 255, 255, 0.9);
  }

  .oa-folder-menu-item:focus {
    outline: none;
    background: rgba(255, 255, 255, 0.08);
  }

  .oa-folder-menu-separator {
    height: 1px;
    background: rgba(255, 255, 255, 0.1);
    margin: 4px 0;
  }

  .oa-new-folder-btn {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 6px 8px;
    margin-bottom: 6px;
    border: 1px dashed rgba(255, 255, 255, 0.2);
    background: transparent;
    border-radius: 4px;
    color: rgba(255, 255, 255, 0.5);
    font-size: 12px;
    font-weight: 400;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .oa-new-folder-btn:hover {
    border-color: rgba(255, 255, 255, 0.4);
    background: rgba(255, 255, 255, 0.05);
    color: rgba(255, 255, 255, 0.9);
  }

  .oa-new-folder-btn:focus {
    outline: none;
    border-color: rgba(255, 255, 255, 0.5);
    background: rgba(255, 255, 255, 0.05);
    box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.1);
  }

  .oa-folder-delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 14px;
    min-width: 14px;
    border: none;
    background: transparent;
    border-radius: 3px;
    cursor: pointer;
    padding: 0;
    margin-left: auto;
    transition: all 0.15s ease;
    color: rgba(255, 255, 255, 0.45);
    opacity: 1;
  }

  .oa-folder-delete-btn:hover {
    background: rgba(255, 82, 82, 0.15);
    color: rgba(255, 82, 82, 0.9);
  }

  .oa-folder-delete-btn:focus {
    outline: none;
    opacity: 1;
    background: rgba(255, 82, 82, 0.15);
    color: rgba(255, 82, 82, 0.9);
    box-shadow: 0 0 0 2px rgba(255, 82, 82, 0.2);
  }

  .oa-folder-delete-btn:active {
    background: rgba(255, 82, 82, 0.25);
    transform: scale(0.95);
  }

  .oa-folder-delete-btn::before {
    content: '';
    display: block;
    width: 7px;
    height: 7px;
    position: relative;
  }

  .oa-folder-delete-btn::before,
  .oa-folder-delete-btn::after {
    position: absolute;
    width: 8px;
    height: 1px;
    background: currentColor;
    border-radius: 1px;
    top: 50%;
    left: 50%;
  }

  .oa-folder-delete-btn::before {
    transform: translate(-50%, -50%) rotate(45deg);
  }

  .oa-folder-delete-btn::after {
    transform: translate(-50%, -50%) rotate(-45deg);
  }
`;

const collapseButton = document.createElement('button');
collapseButton.type = 'button';
collapseButton.className = 'oa-collapse-btn';
collapseButton.setAttribute('aria-label', 'Toggle sidebar');

shadow.appendChild(style);
shadow.appendChild(root);
document.body.appendChild(host);
document.head.appendChild(pageStyle);
const initialCollapsed = isCollapsed();
const initialTop = getStoredTop();

const toggleCollapsed = () => {
  const next = !sidebarElement?.classList.contains('oa-collapsed');
  setCollapsed(sidebarElement, next);
};

collapseButton.addEventListener('click', toggleCollapsed);

let isDragging = false;
let dragOffset = 0;
let allowClick = true;
let dragTargetHeight = 0;
let dragTarget: HTMLElement | null = null;

const beginDrag = (event: MouseEvent, target: HTMLElement) => {
  if (event.button !== 0) {
    return;
  }
  isDragging = true;
  allowClick = true;
  dragTarget = target;
  dragTargetHeight = target.offsetHeight;
  target.classList.add('oa-dragging');
  const rect = target.getBoundingClientRect();
  dragOffset = event.clientY - rect.top;
  event.preventDefault();
};

const updateDrag = (event: MouseEvent) => {
  if (!isDragging) {
    return;
  }
  allowClick = false;
  const maxTop = window.innerHeight - dragTargetHeight - 16;
  const nextTop = clamp(event.clientY - dragOffset, 16, maxTop);
  applyTop(sidebarElement, nextTop);
};

const endDrag = () => {
  if (!isDragging) {
    return;
  }
  isDragging = false;
  dragTarget?.classList.remove('oa-dragging');
  dragTarget = null;
  if (sidebarElement) {
    const rect = sidebarElement.getBoundingClientRect();
    window.localStorage.setItem(positionKey, String(rect.top));
  }
};

document.addEventListener('mousemove', (event) => {
  updateDrag(event);
});

document.addEventListener('mouseup', () => {
  endDrag();
});

type ResizeMode = 'width' | 'corner';

let resizeMode: ResizeMode | null = null;
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

const beginResize = (event: PointerEvent, mode: ResizeMode) => {
  if (event.button !== 0) {
    return;
  }
  if (!sidebarElement) {
    return;
  }
  if (sidebarElement.classList.contains('oa-collapsed')) {
    return;
  }

  resizeMode = mode;
  resizeStartX = event.clientX;
  resizeStartY = event.clientY;
  const rect = sidebarElement.getBoundingClientRect();
  resizeStartWidth = rect.width;
  resizeStartHeight = rect.height;
  sidebarElement.classList.add('oa-resizing');

  (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId);
  event.preventDefault();
  event.stopPropagation();
};

const updateResize = (event: PointerEvent) => {
  if (!resizeMode) {
    return;
  }
  if (!sidebarElement) {
    return;
  }

  const minWidth = 220;
  const maxWidth = Math.max(minWidth, window.innerWidth - 32);
  const deltaX = resizeStartX - event.clientX;
  const nextWidth = clamp(resizeStartWidth + deltaX, minWidth, maxWidth);
  applySidebarWidth(sidebarElement, nextWidth);

  if (resizeMode === 'corner') {
    const minHeight = 160;
    const rect = sidebarElement.getBoundingClientRect();
    const maxHeight = Math.max(minHeight, window.innerHeight - rect.top - 16);
    const deltaY = event.clientY - resizeStartY;
    const nextHeight = clamp(resizeStartHeight + deltaY, minHeight, maxHeight);
    applySidebarHeight(sidebarElement, nextHeight);
    sidebarElement.style.maxHeight = `${maxHeight}px`;
  }

  event.preventDefault();
  event.stopPropagation();
};

const endResize = () => {
  if (!resizeMode) {
    return;
  }
  resizeMode = null;

  if (!sidebarElement) {
    return;
  }

  sidebarElement.classList.remove('oa-resizing');
  const rect = sidebarElement.getBoundingClientRect();
  window.localStorage.setItem(widthKey, String(Math.round(rect.width)));
  if (sidebarElement.style.getPropertyValue('--oa-sidebar-height')) {
    window.localStorage.setItem(heightKey, String(Math.round(rect.height)));
  }
};

document.addEventListener('pointermove', (event) => {
  updateResize(event);
});

document.addEventListener('pointerup', () => {
  endResize();
});

const adapter = adapterMatch.create();
adapter.init();
render(h(Sidebar, { adapter }), root);

type FolderNode = {
  id: string;
  name: string;
  parentId?: string;
};

type FolderState = {
  folders: FolderNode[];
  assignments: Record<string, string>;
};

const folderStateKey = 'oa-folder-state-v1';

const loadFolderState = (): FolderState => {
  const raw = window.localStorage.getItem(folderStateKey);
  if (!raw) {
    return { folders: [], assignments: {} };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<FolderState>;
    const folders = Array.isArray(parsed.folders) ? parsed.folders : [];
    const assignments =
      parsed.assignments && typeof parsed.assignments === 'object'
        ? (parsed.assignments as Record<string, string>)
        : {};
    return { folders, assignments };
  } catch {
    return { folders: [], assignments: {} };
  }
};

const saveFolderState = (state: FolderState) => {
  window.localStorage.setItem(folderStateKey, JSON.stringify(state));
};

const createFolderId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `folder-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const getFolderPath = (folderId: string, folders: FolderNode[]) => {
  const lookup = new Map(folders.map((folder) => [folder.id, folder]));
  const names: string[] = [];
  let current = lookup.get(folderId);
  while (current) {
    names.unshift(current.name);
    current = current.parentId ? lookup.get(current.parentId) : undefined;
  }
  return names.join(' / ');
};

const getDescendantIds = (folderId: string, folders: FolderNode[]) => {
  const childrenMap = new Map<string, string[]>();
  folders.forEach((folder) => {
    if (!folder.parentId) {
      return;
    }
    const list = childrenMap.get(folder.parentId) ?? [];
    list.push(folder.id);
    childrenMap.set(folder.parentId, list);
  });

  const result = new Set<string>();
  const queue = [folderId];
  while (queue.length) {
    const current = queue.shift();
    if (!current) {
      continue;
    }
    result.add(current);
    const children = childrenMap.get(current) ?? [];
    children.forEach((child) => queue.push(child));
  }
  return result;
};

let folderState = loadFolderState();
let activeFolderId = '';

const folderCollapseKey = 'oa-folder-collapsed';
const isFolderPanelCollapsed = () => window.localStorage.getItem(folderCollapseKey) === '1';

const setFolderPanelCollapsed = (collapsed: boolean) => {
  const panel = document.querySelector('.oa-folder-panel');
  if (panel) {
    panel.classList.toggle('oa-collapsed', collapsed);
  }
  window.localStorage.setItem(folderCollapseKey, collapsed ? '1' : '0');
};

const createFolderPanel = (): HTMLElement => {
  const panel = document.createElement('div');
  panel.className = 'oa-folder-panel';
  if (isFolderPanelCollapsed()) {
    panel.classList.add('oa-collapsed');
  }

  const header = document.createElement('div');
  header.className = 'oa-folder-header';

  const title = document.createElement('h4');
  title.className = 'oa-folder-title';
  title.textContent = 'Folders';

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'oa-folder-toggle';
  toggleBtn.setAttribute('aria-label', 'Toggle folder panel');

  header.appendChild(title);
  header.appendChild(toggleBtn);

  const content = document.createElement('div');
  content.className = 'oa-folder-content';

  const newFolderBtn = document.createElement('button');
  newFolderBtn.type = 'button';
  newFolderBtn.className = 'oa-new-folder-btn';
  newFolderBtn.textContent = '+ New Folder';
  newFolderBtn.setAttribute('aria-label', 'Create new folder');

  const tree = document.createElement('div');
  tree.className = 'oa-folder-tree';
  tree.id = 'oa-folder-tree';

  content.appendChild(newFolderBtn);
  content.appendChild(tree);
  panel.appendChild(header);
  panel.appendChild(content);

  toggleBtn.addEventListener('click', () => {
    const isCollapsed = panel.classList.toggle('oa-collapsed');
    window.localStorage.setItem(folderCollapseKey, isCollapsed ? '1' : '0');
  });

  newFolderBtn.addEventListener('click', () => {
    const folderName = prompt('Enter folder name:');
    if (folderName && folderName.trim()) {
      window.dispatchEvent(new CustomEvent('oa-create-folder', {
        detail: { name: folderName.trim() }
      }));
    }
  });

  return panel;
};

const findHistoryContainer = () =>
  document.querySelector<HTMLElement>('#history') ||
  document.querySelector<HTMLElement>('[data-testid="history"]') ||
  document.querySelector<HTMLElement>('[data-testid="history-list"]') ||
  document.querySelector<HTMLElement>('[data-test-id="all-conversations"]');

const injectFolderPanel = () => {
  const history = findHistoryContainer();
  if (!history) {
    return;
  }

  const parent = history.parentElement ?? history;
  if (parent.querySelector('.oa-folder-panel')) {
    return;
  }

  const folderPanel = createFolderPanel();
  parent.insertBefore(folderPanel, history);
  renderFolderPanel();
};



let activeMenuConversationId = '';

const findOpenMenu = () => {
  const geminiConversationMenu = document.querySelector<HTMLElement>(
    '.mat-mdc-menu-panel.conversation-actions-menu'
  );
  if (geminiConversationMenu && geminiConversationMenu.offsetParent !== null) {
    return geminiConversationMenu;
  }
  const menus = Array.from(document.querySelectorAll<HTMLElement>('[role="menu"]'));
  const visibleMenus = menus.filter((menu) => menu.offsetParent !== null);
  if (visibleMenus.length > 0) {
    return visibleMenus[visibleMenus.length - 1];
  }
  const wrappers = Array.from(
    document.querySelectorAll<HTMLElement>('[data-radix-popper-content-wrapper]')
  );
  const visibleWrapper = wrappers.find((wrapper) => wrapper.offsetParent !== null);
  if (visibleWrapper) {
    return visibleWrapper;
  }
  const panels = Array.from(document.querySelectorAll<HTMLElement>('.mat-mdc-menu-panel'));
  const visiblePanel = panels.find((panel) => panel.offsetParent !== null);
  return visiblePanel ?? null;
};

const buildFolderMenu = (conversationId: string) => {
  const menu = document.createElement('div');
  menu.className = 'oa-folder-menu';

  const renderMenu = () => {
    const { folders } = folderState;
    menu.innerHTML = '';

    const unassignedOption = document.createElement('button');
    unassignedOption.type = 'button';
    unassignedOption.className = 'oa-folder-menu-item';
    unassignedOption.textContent = 'Unassigned';
    unassignedOption.dataset.folderId = '';
    unassignedOption.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      menu.classList.remove('show');
      window.dispatchEvent(new CustomEvent('oa-folder-change', {
        detail: { conversationId, folderId: '' }
      }));
    });
    menu.appendChild(unassignedOption);

    if (folders.length > 0) {
      const separator = document.createElement('div');
      separator.className = 'oa-folder-menu-separator';
      menu.appendChild(separator);

      folders.forEach((folder) => {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'oa-folder-menu-item';
        option.textContent = getFolderPath(folder.id, folders);
        option.dataset.folderId = folder.id;
        option.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          menu.classList.remove('show');
          window.dispatchEvent(new CustomEvent('oa-folder-change', {
            detail: { conversationId, folderId: folder.id }
          }));
        });
        menu.appendChild(option);
      });
    }

    const separator2 = document.createElement('div');
    separator2.className = 'oa-folder-menu-separator';
    menu.appendChild(separator2);

    const createFolderOption = document.createElement('button');
    createFolderOption.type = 'button';
    createFolderOption.className = 'oa-folder-menu-item';
    createFolderOption.textContent = '+ New Folder';
    createFolderOption.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      menu.classList.remove('show');
      const folderName = prompt('Enter folder name:');
      if (folderName && folderName.trim()) {
        window.dispatchEvent(new CustomEvent('oa-create-folder', {
          detail: { name: folderName.trim(), conversationId }
        }));
      }
    });
    menu.appendChild(createFolderOption);
  };

  renderMenu();

  window.addEventListener('oa-folder-update', () => {
    renderMenu();
  });

  return menu;
};

let pendingFolderRender = 0;

const renderFolderPanel = () => {
  if (pendingFolderRender) {
    return;
  }
  pendingFolderRender = window.setTimeout(() => {
    pendingFolderRender = 0;
    const panel = document.querySelector<HTMLElement>('.oa-folder-panel');
    if (!panel) {
      return;
    }
    updateFolderTree(folderState.folders);
    applyFolderFilter();
  }, 120);
};

const showFolderMenu = (conversationId: string, anchor: HTMLElement) => {
  const existingMenu = document.querySelector<HTMLElement>('.oa-folder-menu.show');
  if (existingMenu) {
    existingMenu.classList.remove('show');
    existingMenu.remove();
  }

  const menu = buildFolderMenu(conversationId);
  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  const maxHeight = 240;
  const gap = 4;
  const belowTop = rect.bottom + gap;
  const aboveTop = rect.top - gap - maxHeight;
  const fitsBelow = belowTop + maxHeight <= window.innerHeight - 8;
  menu.style.top = `${fitsBelow ? belowTop : Math.max(8, aboveTop)}px`;
  menu.style.left = `${Math.max(8, rect.left)}px`;
  menu.style.maxHeight = `${Math.min(maxHeight, window.innerHeight - 16)}px`;
  menu.style.overflowY = 'auto';
  menu.style.pointerEvents = 'auto';
  menu.classList.add('show');

  const dismiss = (event: MouseEvent) => {
    if (!menu.contains(event.target as Node)) {
      menu.classList.remove('show');
      menu.remove();
      document.removeEventListener('click', dismiss);
    }
  };

  document.addEventListener('click', dismiss);
};

const injectFolderMenuItem = (menu: HTMLElement, conversationId: string) => {
  if (menu.querySelector('.oa-folder-entry')) {
    return;
  }

  const existingItem =
    menu.querySelector<HTMLElement>('[role="menuitem"]') ??
    menu.querySelector<HTMLElement>('button');

  let entry: HTMLElement;
  if (existingItem) {
    entry = existingItem.cloneNode(true) as HTMLElement;
    entry.removeAttribute('data-state');
    entry.removeAttribute('data-highlighted');
    entry.removeAttribute('aria-disabled');
    entry.removeAttribute('aria-checked');
    entry.textContent = 'Assign to folder';
  } else {
    entry = document.createElement('button');
    entry.textContent = 'Assign to folder';
  }

  entry.classList.add('oa-folder-entry');
  entry.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    showFolderMenu(conversationId, entry);
  });

  const menuContent =
    menu.querySelector<HTMLElement>('.mat-mdc-menu-content') ??
    menu.querySelector<HTMLElement>('[role="menu"]') ??
    menu;

  const existingEntries = menuContent.querySelectorAll('.oa-folder-entry');
  if (existingEntries.length > 0) {
    return;
  }

  if (!entry.hasAttribute('role')) {
    entry.setAttribute('role', 'menuitem');
  }
  entry.setAttribute('tabindex', '0');

  const separator = document.createElement('div');
  separator.className = 'oa-folder-menu-separator';

  menuContent.appendChild(separator);
  menuContent.appendChild(entry);
};

const getConversationIdFromElement = (element: HTMLElement) => {
  const href = element.getAttribute('href');
  if (href) {
    const match = href.match(/\/c\/([a-f0-9-]+)/i);
    if (match) {
      return match[1];
    }
  }
  const jslog = element.getAttribute('jslog') || '';
  const jslogMatch = jslog.match(/c_([a-f0-9]+)/i);
  if (jslogMatch) {
    return `c_${jslogMatch[1]}`;
  }
  const testId = element.getAttribute('data-test-id');
  if (testId && testId.startsWith('conversation')) {
    const key = element.getAttribute('jslog');
    if (key) {
      return key;
    }
  }
  return null;
};

const getConversationIdFromMenu = (menu: HTMLElement) => {
  const menuItems = Array.from(menu.querySelectorAll<HTMLElement>('[jslog]'));
  for (const item of menuItems) {
    const jslog = item.getAttribute('jslog') || '';
    const match = jslog.match(/c_([a-f0-9]+)/i);
    if (match) {
      return `c_${match[1]}`;
    }
  }
  return null;
};

const applyFolderFilter = () => {
  const chatgptItems = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[data-sidebar-item="true"][href*="/c/"]')
  );
  const geminiItems = Array.from(
    document.querySelectorAll<HTMLElement>('[data-test-id="conversation"]')
  );
  const items: HTMLElement[] = [...chatgptItems, ...geminiItems];
  const allowedFolderIds = activeFolderId
    ? getDescendantIds(activeFolderId, folderState.folders)
    : new Set<string>();

  items.forEach((item) => {
    const conversationId = getConversationIdFromElement(item);
    if (!conversationId) {
      return;
    }
    const assignedFolderId = folderState.assignments[conversationId];

    if (!activeFolderId) {
      item.style.display = '';
      return;
    }

    const isVisible =
      assignedFolderId && allowedFolderIds.has(assignedFolderId);
    item.style.display = isVisible ? '' : 'none';
  });
};

const updateFolderTree = (folders: FolderNode[]) => {
  const tree = document.getElementById('oa-folder-tree');
  if (!tree) return;

  tree.innerHTML = '';

  const allItem = document.createElement('div');
  allItem.className = 'oa-folder-item';
  allItem.textContent = 'All Conversations';
  allItem.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('oa-folder-filter', {
      detail: { folderId: '' }
    }));
    document.querySelectorAll('.oa-folder-item').forEach((i) => i.classList.remove('active'));
    allItem.classList.add('active');
  });
  if (!activeFolderId) {
    allItem.classList.add('active');
  }
  tree.appendChild(allItem);

  if (folders.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'oa-folder-item';
    empty.style.color = 'rgba(255, 255, 255, 0.4)';
    empty.style.cursor = 'default';
    empty.textContent = 'No folders yet';
    tree.appendChild(empty);
    return;
  }

  const childrenMap = new Map<string, FolderNode[]>();
  folders.forEach((folder) => {
    const parent = folder.parentId ?? '';
    const list = childrenMap.get(parent) ?? [];
    list.push(folder);
    childrenMap.set(parent, list);
  });

  const buildNodes = (parentId: string, depth: number) => {
    const items = childrenMap.get(parentId) ?? [];
    items.forEach((folder) => {
      const item = document.createElement('div');
      item.className = 'oa-folder-item';
      item.dataset.folderId = folder.id;
      item.style.marginLeft = `${depth * 12}px`;

      const nameSpan = document.createElement('span');
      nameSpan.textContent = folder.name;
      item.appendChild(nameSpan);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'oa-folder-delete-btn';
      deleteBtn.setAttribute('aria-label', `Delete folder ${folder.name}`);
      deleteBtn.dataset.folderId = folder.id;
      deleteBtn.dataset.folderName = folder.name;
      item.appendChild(deleteBtn);

      item.addEventListener('click', (e) => {
        if (e.target === deleteBtn || deleteBtn.contains(e.target as Node)) {
          return;
        }
        window.dispatchEvent(new CustomEvent('oa-folder-filter', {
          detail: { folderId: folder.id }
        }));
        document.querySelectorAll('.oa-folder-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
      });

      if (activeFolderId === folder.id) {
        item.classList.add('active');
      }
      tree.appendChild(item);
      buildNodes(folder.id, depth + 1);
    });
  };

  buildNodes('', 0);
};

const initLeftSidebarFolders = () => {
  injectFolderPanel();

  const observer = new MutationObserver((mutations) => {
    const shouldUpdate = mutations.some((mutation) => {
      const target = mutation.target as HTMLElement;
      if (target?.closest?.('.oa-folder-panel')) {
        return false;
      }
      return true;
    });
    if (!shouldUpdate) {
      return;
    }
    injectFolderPanel();
    renderFolderPanel();
  });

  observer.observe(document.body, {
    subtree: true,
    childList: true
  });

  window.addEventListener('oa-folder-tree-update', ((e: CustomEvent) => {
    const folders = e.detail.folders;
    updateFolderTree(folders);
  }) as EventListener);

  window.addEventListener('oa-folder-change', ((e: CustomEvent) => {
    const { conversationId, folderId } = e.detail;
    if (!conversationId) {
      return;
    }
    if (folderId) {
      folderState.assignments[conversationId] = folderId;
    } else {
      delete folderState.assignments[conversationId];
    }
    saveFolderState(folderState);
    applyFolderFilter();
    window.dispatchEvent(new CustomEvent('oa-folder-update'));
  }) as EventListener);

  window.addEventListener('oa-create-folder', ((e: CustomEvent) => {
    const { name, conversationId } = e.detail;
    if (!name) {
      return;
    }
    const newFolder: FolderNode = {
      id: createFolderId(),
      name: name.trim()
    };
    folderState.folders.push(newFolder);
    if (conversationId) {
      folderState.assignments[conversationId] = newFolder.id;
    }
    saveFolderState(folderState);
    updateFolderTree(folderState.folders);
    window.dispatchEvent(new CustomEvent('oa-folder-update'));
    applyFolderFilter();
  }) as EventListener);

  window.addEventListener('oa-folder-filter', ((e: CustomEvent) => {
    const { folderId } = e.detail;
    activeFolderId = folderId ?? '';
    applyFolderFilter();
  }) as EventListener);

  window.addEventListener('oa-folder-delete', ((e: CustomEvent) => {
    const { folderId } = e.detail;
    if (!folderId) {
      return;
    }
    const removeIds = getDescendantIds(folderId, folderState.folders);
    folderState.folders = folderState.folders.filter((folder) => !removeIds.has(folder.id));
    Object.keys(folderState.assignments).forEach((conversationId) => {
      const assignedFolderId = folderState.assignments[conversationId];
      if (assignedFolderId && removeIds.has(assignedFolderId)) {
        delete folderState.assignments[conversationId];
      }
    });
    if (activeFolderId && removeIds.has(activeFolderId)) {
      activeFolderId = '';
    }
    saveFolderState(folderState);
    renderFolderPanel();
    window.dispatchEvent(new CustomEvent('oa-folder-update'));
  }) as EventListener);

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const deleteBtn = target.closest<HTMLElement>('.oa-folder-delete-btn');
    if (!deleteBtn) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const folderId = deleteBtn.dataset.folderId ?? '';
    const folderName = deleteBtn.dataset.folderName ?? 'this folder';
    if (!folderId) {
      return;
    }
    const confirmed = confirm(`Delete folder "${folderName}"?`);
    if (!confirmed) {
      return;
    }
    window.dispatchEvent(new CustomEvent('oa-folder-delete', {
      detail: { folderId }
    }));
  });

  document.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    if (!target) {
      return;
    }
    const menuTrigger = target.closest<HTMLElement>('[data-trailing-button]');
    const geminiMenuTrigger = target.closest<HTMLElement>('[data-test-id="actions-menu-button"]');
    const geminiConversation = target.closest<HTMLElement>('[data-test-id="conversation"]');
    if (!menuTrigger && !geminiMenuTrigger) {
      return;
    }

    const conversationAnchor = menuTrigger
      ? menuTrigger.closest<HTMLAnchorElement>('a[data-sidebar-item="true"][href*="/c/"]')
      : null;

    const conversationElement = conversationAnchor ?? geminiConversation;
    if (!conversationElement) {
      return;
    }

    const conversationId = getConversationIdFromElement(conversationElement);
    if (!conversationId) {
      return;
    }

    activeMenuConversationId = conversationId;
    const attemptInject = () => {
      const menu = findOpenMenu();
      if (!menu) {
        return;
      }
      const inferredId = getConversationIdFromMenu(menu) ?? conversationId;
      injectFolderMenuItem(menu, inferredId);
    };
    requestAnimationFrame(attemptInject);
    [50, 100, 150, 250, 400].forEach((delay) => {
      window.setTimeout(attemptInject, delay);
    });
  });

  renderFolderPanel();
  window.dispatchEvent(new CustomEvent('oa-folder-update'));

  window.addEventListener('storage', (event) => {
    if (event.key !== folderStateKey) {
      return;
    }
    folderState = loadFolderState();
    renderFolderPanel();
  });
};

if (
  window.location.hostname.includes('chatgpt.com') ||
  window.location.hostname.includes('gemini.google.com') ||
  window.location.hostname.includes('business.gemini.google')
) {
  initLeftSidebarFolders();
}

requestAnimationFrame(() => {
  sidebarElement = shadow.querySelector('.oa-sidebar');
  if (!sidebarElement) {
    return;
  }
  const header = shadow.querySelector<HTMLElement>('.oa-header');
  const colorInput = shadow.querySelector<HTMLInputElement>('.oa-color-picker');

  const ensureResizeHandles = () => {
    if (!sidebarElement) {
      return;
    }
    if (sidebarElement.querySelector('.oa-resize-handle')) {
      return;
    }

    const handleWidth = document.createElement('div');
    handleWidth.className = 'oa-resize-handle oa-resize-handle-ew';
    handleWidth.setAttribute('aria-hidden', 'true');
    handleWidth.addEventListener('pointerdown', (event) => beginResize(event, 'width'));

    const handleCorner = document.createElement('div');
    handleCorner.className = 'oa-resize-handle oa-resize-handle-se';
    handleCorner.setAttribute('aria-hidden', 'true');
    handleCorner.addEventListener('pointerdown', (event) => beginResize(event, 'corner'));

    sidebarElement.appendChild(handleWidth);
    sidebarElement.appendChild(handleCorner);
  };

  if (header) {
    header.appendChild(collapseButton);
    header.addEventListener('mousedown', (event) => beginDrag(event, header));
  }
  const storedColor = getStoredColor();
  if (colorInput) {
    colorInput.value = storedColor;
    colorInput.addEventListener('change', () => {
      const color = colorInput.value || defaultColor;
      applySidebarColor(sidebarElement, color);
      window.localStorage.setItem(colorKey, color);
    });
  }

  const initialTop = getStoredTop();
  applyTop(sidebarElement, initialTop);

  const storedWidth = getStoredSize(widthKey);
  if (storedWidth) {
    const minWidth = 220;
    const maxWidth = Math.max(minWidth, window.innerWidth - 32);
    applySidebarWidth(sidebarElement, clamp(storedWidth, minWidth, maxWidth));
  }
  const storedHeight = getStoredSize(heightKey);
  if (storedHeight) {
    const minHeight = 160;
    const maxHeight = Math.max(minHeight, window.innerHeight - initialTop - 16);
    sidebarElement.style.maxHeight = `${maxHeight}px`;
    applySidebarHeight(sidebarElement, clamp(storedHeight, minHeight, maxHeight));
  }
  ensureResizeHandles();
  applySidebarColor(sidebarElement, storedColor);
  setCollapsed(sidebarElement, isCollapsed());
});
