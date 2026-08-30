import type { AnyExtension } from '@tiptap/core';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import {
  documentContentFingerprint,
  EMPTY_DOCUMENT,
  toDocumentContent,
  type DocumentContent,
  type DocumentLocationState,
} from '../models/document-content';
import { useDocumentAutosave } from '../hooks/use-document-autosave';
import { useDocumentEditor } from '../hooks/use-document-editor';
import { EditorToolbar } from './editor-toolbar';
import styles from './document-editor-page.module.css';
import { RevisionConflictDialog } from './revision-conflict-dialog';
import { SaveStatus } from './save-status';

export interface DocumentEditorPageProps {
  onClose?: () => void;
  onSaveAsCopy?: () => void | Promise<void>;
  resourceId?: string;
  resourceName?: string;
}

export function DocumentEditorPage({
  onClose,
  onSaveAsCopy,
  resourceId: resourceIdProp,
  resourceName: resourceNameProp,
}: DocumentEditorPageProps): JSX.Element {
  const params = useParams<{ resourceId?: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const resourceId = resourceIdProp ?? params.resourceId ?? null;
  const locationState = location.state as DocumentLocationState | null;
  const resourceName =
    resourceNameProp ?? locationState?.resourceName ?? resourceId ?? '未命名文档';
  const editorState = useDocumentEditor(resourceId);
  const [isReloading, setIsReloading] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const canEditRef = useRef(false);
  const updateContentRef = useRef(editorState.updateContent);
  const localEditorFingerprintRef = useRef<string | null>(null);
  const appliedContentFingerprintRef = useRef<string | null>(null);

  const extensions = useMemo<AnyExtension[]>(
    () =>
      [
        StarterKit.configure({ heading: { levels: [1, 2, 3, 4, 5, 6] } }),
        Link.configure({
          autolink: false,
          linkOnPaste: false,
          openOnClick: false,
        }),
        Underline,
      ] as unknown as AnyExtension[],
    [],
  );

  useEffect(() => {
    canEditRef.current = editorState.canEdit;
    updateContentRef.current = editorState.updateContent;
  }, [editorState.canEdit, editorState.updateContent]);

  const editor = useEditor(
    {
      content: EMPTY_DOCUMENT,
      editable: false,
      editorProps: {
        attributes: {
          'aria-label': '文档编辑区',
          role: 'textbox',
          spellcheck: 'true',
        },
      },
      extensions,
      onUpdate: ({ editor: currentEditor }) => {
        if (!canEditRef.current) return;
        const nextContent = currentEditor.getJSON() as DocumentContent;
        localEditorFingerprintRef.current = documentContentFingerprint(nextContent);
        updateContentRef.current(nextContent);
      },
    },
    [extensions],
  );

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editorState.canEdit);
  }, [editor, editorState.canEdit]);

  useEffect(() => {
    if (!editor || editorState.content === null) return;
    const nextContent = toDocumentContent(editorState.content);
    const nextFingerprint = documentContentFingerprint(nextContent);
    if (localEditorFingerprintRef.current === nextFingerprint) {
      localEditorFingerprintRef.current = null;
      appliedContentFingerprintRef.current = nextFingerprint;
      return;
    }
    if (appliedContentFingerprintRef.current === nextFingerprint) return;
    editor.commands.setContent(nextContent, false);
    appliedContentFingerprintRef.current = nextFingerprint;
  }, [editor, editorState.content]);

  const autosave = useDocumentAutosave({
    content: editorState.content,
    enabled: editorState.canEdit,
    onConflict: editorState.setConflict,
    resourceKey: resourceId ?? 'empty-document',
    revision: editorState.revision,
    save: editorState.save,
  });

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!autosave.hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = '文档尚未保存';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [autosave.hasUnsavedChanges]);

  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    navigate(-1);
  }, [navigate, onClose]);

  const handleReload = useCallback(async () => {
    setIsReloading(true);
    try {
      const result = await editorState.reload();
      if (result) {
        autosave.reset(toDocumentContent(result.content), result.revision);
      }
    } finally {
      setIsReloading(false);
    }
  }, [autosave, editorState]);

  const handleSaveAsCopy = useCallback(async () => {
    if (onSaveAsCopy) {
      await onSaveAsCopy();
      return;
    }
    setCopyNotice('另存为副本功能将在后续任务接入');
  }, [onSaveAsCopy]);

  return (
    <main
      className={styles.page}
      aria-labelledby="document-title"
      aria-busy={editorState.isLoading || isReloading}
    >
      <header className={styles.header}>
        <div className={styles.heading}>
          <button className={styles.backButton} type="button" onClick={handleClose}>
            返回文件列表
          </button>
          <div>
            <p className={styles.eyebrow}>ASTER DRIVE</p>
            <h1 id="document-title">{resourceName}</h1>
          </div>
        </div>
        <SaveStatus
          error={autosave.error}
          readOnly={!editorState.canEdit}
          status={autosave.status}
        />
      </header>

      <section aria-label="文档编辑器" className={styles.workspace}>
        <EditorToolbar disabled={!editorState.canEdit} editor={editor} />
        {editorState.isLoading ? (
          <p className={styles.feedback} role="status" aria-live="polite">
            正在加载文档…
          </p>
        ) : null}
        {editorState.isError ? (
          <div className={styles.feedback} role="alert" aria-live="assertive">
            <p>{editorState.error?.message ?? '文档加载失败，请稍后重试'}</p>
            <button type="button" onClick={() => void editorState.reload()}>
              重新加载
            </button>
          </div>
        ) : null}
        <div className={styles.editorFrame}>
          <EditorContent className={styles.editorContent} editor={editor} />
        </div>
        {copyNotice ? (
          <p className={styles.notice} role="status" aria-live="polite">
            {copyNotice}
          </p>
        ) : null}
      </section>

      <RevisionConflictDialog
        errorMessage={
          autosave.error instanceof Error ? autosave.error.message : undefined
        }
        isReloading={isReloading}
        onReload={handleReload}
        onSaveAsCopy={handleSaveAsCopy}
        open={editorState.conflict !== null || autosave.status === 'conflict'}
      />
    </main>
  );
}
