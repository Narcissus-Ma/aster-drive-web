import type { CopyOperationStatus } from '../../../shared/api/generated/openapi';
import styles from './copy-progress.module.css';

export interface CopyProgressOperation {
  id?: string | null;
  operation_id?: string | null;
  progress?: number;
  resource?: { id: string } | null;
  status: CopyOperationStatus;
  last_error?: string | null;
}

export interface CopyProgressProps {
  onDismiss: () => void;
  onOpenResource: (resourceId: string) => void;
  operation: CopyProgressOperation | null;
}

function statusLabel(status: CopyOperationStatus): string {
  switch (status) {
    case 'succeeded':
      return '复制完成';
    case 'failed':
      return '复制失败';
    case 'canceled':
      return '复制已取消';
    default:
      return '复制中';
  }
}

export function CopyProgress({
  onDismiss,
  onOpenResource,
  operation,
}: CopyProgressProps): JSX.Element | null {
  if (!operation) return null;
  const progress = Math.min(100, Math.max(0, operation.progress ?? 0));
  const completed = operation.status === 'succeeded';
  const failed = operation.status === 'failed' || operation.status === 'canceled';

  return (
    <aside aria-label="复制进度" className={styles.panel} data-testid="copy-progress">
      <div className={styles.header}>
        <strong>{statusLabel(operation.status)}</strong>
        <button type="button" aria-label="关闭" onClick={onDismiss}>
          ×
        </button>
      </div>
      {!failed ? <progress aria-label="复制进度" max={100} value={progress} /> : null}
      {failed && operation.last_error ? (
        <p className={styles.error} role="alert">
          {operation.last_error}
        </p>
      ) : null}
      {completed && operation.resource?.id ? (
        <button
          type="button"
          className={styles.openButton}
          onClick={() => onOpenResource(operation.resource?.id ?? '')}
        >
          打开副本
        </button>
      ) : null}
    </aside>
  );
}
