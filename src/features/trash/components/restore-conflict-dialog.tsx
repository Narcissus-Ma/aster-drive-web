import { useEffect, useRef } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './restore-conflict-dialog.module.css';

export interface RestoreConflictDialogProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onRetry: () => void | Promise<void>;
  resource: ResourceResponse | null;
}

export function RestoreConflictDialog({
  errorMessage,
  isSubmitting = false,
  onCancel,
  onRetry,
  resource,
}: RestoreConflictDialogProps): JSX.Element | null {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const resourceId = resource?.id;

  useEffect(() => {
    if (!resourceId) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [resourceId]);

  if (!resource) return null;

  return (
    <div
      aria-labelledby="restore-conflict-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <div className={styles.dialog}>
        <h2 id="restore-conflict-title">恢复名称冲突</h2>
        <p>
          回收站中的“{resource.name}
          ”无法恢复，因为原目录已有同名资源。请先处理同名资源后再重试。
        </p>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            disabled={isSubmitting}
            type="button"
            onClick={onCancel}
          >
            关闭
          </button>
          <button disabled={isSubmitting} type="button" onClick={() => void onRetry()}>
            {isSubmitting ? '恢复中…' : '重试恢复'}
          </button>
        </div>
      </div>
    </div>
  );
}
