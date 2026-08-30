import type { DocumentSaveStatus } from '../models/document-content';
import styles from './save-status.module.css';

export interface SaveStatusProps {
  error?: unknown;
  readOnly?: boolean;
  status: DocumentSaveStatus;
}

const statusLabels: Record<DocumentSaveStatus, string> = {
  conflict: '存在版本冲突',
  dirty: '未保存',
  error: '保存失败',
  idle: '等待编辑',
  saved: '已保存',
  saving: '正在保存…',
};

export function SaveStatus({
  error,
  readOnly = false,
  status,
}: SaveStatusProps): JSX.Element {
  const label = readOnly ? '只读' : statusLabels[status];
  const hasError = error instanceof Error;
  return (
    <div className={styles.container} data-testid="document-save-status">
      <output aria-live="polite" role="status">
        {label}
      </output>
      {!readOnly && hasError ? (
        <span className={styles.detail}>{error.message}</span>
      ) : null}
    </div>
  );
}
