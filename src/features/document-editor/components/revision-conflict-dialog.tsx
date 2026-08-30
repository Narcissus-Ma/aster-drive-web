import styles from './revision-conflict-dialog.module.css';

export interface RevisionConflictDialogProps {
  errorMessage?: string;
  isReloading?: boolean;
  onReload: () => void | Promise<void>;
  onSaveAsCopy: () => void | Promise<void>;
  open: boolean;
}

export function RevisionConflictDialog({
  errorMessage,
  isReloading = false,
  onReload,
  onSaveAsCopy,
  open,
}: RevisionConflictDialogProps): JSX.Element | null {
  if (!open) return null;

  return (
    <div
      aria-labelledby="revision-conflict-dialog-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <section className={styles.dialog}>
        <h2 id="revision-conflict-dialog-title">文档已被其他窗口更新</h2>
        <p>当前内容基于旧版本，请选择如何继续。</p>
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button disabled={isReloading} type="button" onClick={() => void onReload()}>
            {isReloading ? '加载中…' : '加载最新版本'}
          </button>
          <button
            disabled={isReloading}
            type="button"
            onClick={() => void onSaveAsCopy()}
          >
            另存为副本
          </button>
        </div>
      </section>
    </div>
  );
}
