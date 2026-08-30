import { useEffect, useId, useRef, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './copy-dialog.module.css';

export interface CopyFolderOption {
  id: string;
  kind: 'folder' | 'root';
  name: string;
  parentId: string | null;
}

export interface CopySubmitValues {
  name: string;
  targetParentId: string;
}

export interface CopyDialogProps {
  errorMessage?: string | null;
  folders: CopyFolderOption[];
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (values: CopySubmitValues) => void | Promise<void>;
  resource: ResourceResponse | null;
}

export function CopyDialog({
  errorMessage,
  folders,
  isSubmitting = false,
  onCancel,
  onSubmit,
  resource,
}: CopyDialogProps): JSX.Element | null {
  const availableFolders = folders.filter(
    (folder) => folder.kind === 'root' || folder.kind === 'folder',
  );
  const [targetParentId, setTargetParentId] = useState('');
  const [name, setName] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const nameId = useId();
  const targetId = useId();
  const resourceId = resource?.id;
  const unsupported = resource?.kind === 'folder' || resource?.kind === 'root';

  useEffect(() => {
    if (!resource) return;
    setTargetParentId('');
    setName(resource.name);
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    selectRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [resource, resourceId]);

  if (!resource) return null;

  const hasValidTarget =
    !unsupported &&
    name.trim().length > 0 &&
    availableFolders.some((folder) => folder.id === targetParentId);

  return (
    <div
      aria-labelledby={`${targetId}-title`}
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <form
        className={styles.dialog}
        onSubmit={(event) => {
          event.preventDefault();
          if (hasValidTarget) {
            void onSubmit({ name: name.trim(), targetParentId });
          }
        }}
      >
        <h2 id={`${targetId}-title`}>复制资源</h2>
        <p>选择“{resource.name}”副本的目标目录和名称。</p>
        {unsupported ? (
          <p className={styles.alert} role="alert">
            暂不支持复制文件夹
          </p>
        ) : null}
        <label htmlFor={targetId}>目标目录</label>
        <select
          ref={selectRef}
          aria-label="目标目录"
          disabled={isSubmitting || unsupported}
          id={targetId}
          onChange={(event) => setTargetParentId(event.target.value)}
          value={targetParentId}
        >
          <option value="">请选择目录</option>
          {availableFolders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
        <label htmlFor={nameId}>副本名称</label>
        <input
          aria-label="副本名称"
          disabled={isSubmitting || unsupported}
          id={nameId}
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {errorMessage ? (
          <p className={styles.alert} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button disabled={isSubmitting} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={!hasValidTarget || isSubmitting} type="submit">
            {isSubmitting ? '复制中…' : '复制'}
          </button>
        </div>
      </form>
    </div>
  );
}
