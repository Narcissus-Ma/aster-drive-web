import type { ChainedCommands, Editor } from '@tiptap/core';

import styles from './editor-toolbar.module.css';

export interface EditorToolbarProps {
  disabled?: boolean;
  editor: Editor | null;
}

interface ToolbarAction {
  label: string;
  run: (editor: Editor) => boolean;
}

const actions: ToolbarAction[] = [
  { label: '加粗', run: (editor) => editor.chain().focus().toggleMark('bold').run() },
  { label: '斜体', run: (editor) => editor.chain().focus().toggleMark('italic').run() },
  {
    label: '下划线',
    run: (editor) => editor.chain().focus().toggleMark('underline').run(),
  },
  {
    label: '删除线',
    run: (editor) => editor.chain().focus().toggleMark('strike').run(),
  },
  {
    label: '项目符号列表',
    run: (editor) => editor.chain().focus().toggleList('bulletList', 'listItem').run(),
  },
  {
    label: '编号列表',
    run: (editor) => editor.chain().focus().toggleList('orderedList', 'listItem').run(),
  },
  {
    label: '引用',
    run: (editor) => editor.chain().focus().toggleWrap('blockquote').run(),
  },
  {
    label: '代码块',
    run: (editor) => editor.chain().focus().toggleNode('codeBlock', 'paragraph').run(),
  },
];

interface HistoryChain extends ChainedCommands {
  redo: () => HistoryChain;
  undo: () => HistoryChain;
}

interface HistoryEditor extends Editor {
  chain: () => HistoryChain;
}

export function EditorToolbar({
  disabled = false,
  editor,
}: EditorToolbarProps): JSX.Element {
  const isDisabled = disabled || editor === null;
  return (
    <div aria-label="编辑工具栏" className={styles.toolbar} role="toolbar">
      {actions.map((action) => (
        <button
          key={action.label}
          aria-label={action.label}
          className={styles.button}
          disabled={isDisabled}
          type="button"
          onClick={() => {
            if (!editor) return;
            action.run(editor);
          }}
        >
          {action.label}
        </button>
      ))}
      <span className={styles.separator} aria-hidden="true" />
      <button
        aria-label="撤销"
        className={styles.button}
        disabled={isDisabled}
        type="button"
        onClick={() => {
          if (!editor) return;
          const chain = (editor as HistoryEditor).chain().focus() as HistoryChain;
          chain.undo().run();
        }}
      >
        撤销
      </button>
      <button
        aria-label="重做"
        className={styles.button}
        disabled={isDisabled}
        type="button"
        onClick={() => {
          if (!editor) return;
          const chain = (editor as HistoryEditor).chain().focus() as HistoryChain;
          chain.redo().run();
        }}
      >
        重做
      </button>
    </div>
  );
}
