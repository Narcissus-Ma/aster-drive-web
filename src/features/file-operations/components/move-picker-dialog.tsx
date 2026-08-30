import { useEffect, useRef, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './move-picker-dialog.module.css';

export interface MoveFolderOption {
  id: string;
  kind: 'folder' | 'root';
  name: string;
  parentId: string | null;
}

export interface MovePickerDialogProps {
  errorMessage?: string | null;
  folders: MoveFolderOption[];
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (targetParentId: string) => void | Promise<void>;
  resource: ResourceResponse | null;
}

function isDescendant(
  candidateId: string,
  resourceId: string,
  folders: MoveFolderOption[],
): boolean {
  const parents = new Map(folders.map((folder) => [folder.id, folder.parentId]));
  let currentId: string | null = candidateId;
  const visited = new Set<string>();
  while (currentId && !visited.has(currentId)) {
    if (currentId === resourceId) return true;
    visited.add(currentId);
    currentId = parents.get(currentId) ?? null;
  }
  return false;
}

export function MovePickerDialog({
  errorMessage,
  folders,
  isSubmitting = false,
  onCancel,
  onSubmit,
  resource,
}: MovePickerDialogProps): JSX.Element | null {
  const availableFolders = folders.filter(
    (folder) => folder.kind === 'root' || folder.kind === 'folder',
  );
  const [targetParentId, setTargetParentId] = useState('');
  const selectRef = useRef<HTMLSelectElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const resourceId = resource?.id;

  useEffect(() => {
    if (!resourceId) return;
    setTargetParentId('');
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    selectRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [resourceId]);

  if (!resource) return null;

  const hasValidTarget = availableFolders.some(
    (folder) =>
      folder.id === targetParentId &&
      !isDescendant(folder.id, resource.id, availableFolders),
  );

  return (
    <div
      aria-labelledby="move-picker-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <form
        className={styles.dialog}
        onSubmit={(event) => {
          event.preventDefault();
          if (hasValidTarget) void onSubmit(targetParentId);
        }}
      >
        <h2 id="move-picker-title">移动到</h2>
        <p>选择“{resource.name}”要移动到的目录。</p>
        <label htmlFor="move-target-directory">目标目录</label>
        <select
          ref={selectRef}
          aria-label="目标目录"
          disabled={isSubmitting}
          id="move-target-directory"
          onChange={(event) => setTargetParentId(event.target.value)}
          value={targetParentId}
        >
          <option value="">请选择目录</option>
          {availableFolders.map((folder) => {
            const disabled = isDescendant(folder.id, resource.id, availableFolders);
            return (
              <option disabled={disabled} key={folder.id} value={folder.id}>
                {folder.name}
                {disabled ? '（不可选）' : ''}
              </option>
            );
          })}
        </select>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button disabled={isSubmitting} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={!hasValidTarget || isSubmitting} type="submit">
            {isSubmitting ? '移动中…' : '移动'}
          </button>
        </div>
      </form>
    </div>
  );
}
