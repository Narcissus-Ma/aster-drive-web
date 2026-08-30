import { useEffect, useRef, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './delete-confirm-dialog.module.css';

export type DeleteMode = 'purge' | 'trash';

export interface DeleteConfirmDialogProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  mode: DeleteMode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
  resource: ResourceResponse | null;
}

export function DeleteConfirmDialog({
  errorMessage,
  isSubmitting = false,
  mode,
  onCancel,
  onConfirm,
  resource,
}: DeleteConfirmDialogProps): JSX.Element | null {
  const [secondConfirmation, setSecondConfirmation] = useState(false);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resourceId = resource?.id;

  useEffect(() => {
    if (!resourceId) return;
    setSecondConfirmation(false);
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [resourceId, mode]);

  if (!resource) return null;

  const isPurge = mode === 'purge';
  const handleConfirm = () => {
    if (isPurge && !secondConfirmation) {
      setSecondConfirmation(true);
      return;
    }
    void onConfirm();
  };

  return (
    <div
      aria-labelledby="delete-confirm-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <div className={styles.dialog}>
        <h2 id="delete-confirm-title">{isPurge ? '永久删除' : '移入回收站'}</h2>
        <p>
          {isPurge
            ? `此操作不可恢复，将永久删除“${resource.name}”。`
            : `确认将“${resource.name}”移入回收站吗？`}
        </p>
        {isPurge && secondConfirmation ? (
          <p className={styles.warning} role="status">
            请再次确认永久删除“{resource.name}”。
          </p>
        ) : null}
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            取消
          </button>
          <button disabled={isSubmitting} type="button" onClick={handleConfirm}>
            {isSubmitting
              ? isPurge
                ? '删除中…'
                : '移入中…'
              : isPurge && !secondConfirmation
                ? '继续永久删除'
                : isPurge
                  ? '确认永久删除'
                  : '移入回收站'}
          </button>
        </div>
      </div>
    </div>
  );
}
