import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import styles from './create-folder-dialog.module.css';

export interface CreateFolderDialogProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
  open: boolean;
}

export function CreateFolderDialog({
  errorMessage,
  isSubmitting = false,
  onCancel,
  onSubmit,
  open,
}: CreateFolderDialogProps): JSX.Element | null {
  const [name, setName] = useState('');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const inputId = useId();

  useEffect(() => {
    if (!open) return;
    setName('');
    setValidationMessage(null);
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length === 0) {
      setValidationMessage('文件夹名称不能为空');
      return;
    }
    setValidationMessage(null);
    void onSubmit(nextName);
  };

  return (
    <div
      aria-labelledby={`${titleId}-title`}
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <h2 id={`${titleId}-title`}>新建文件夹</h2>
        <p>在当前目录创建一个新的文件夹。</p>
        <label htmlFor={inputId}>文件夹名称</label>
        <input
          ref={inputRef}
          aria-label="文件夹名称"
          disabled={isSubmitting}
          id={inputId}
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {validationMessage ? (
          <p className={styles.alert} role="alert">
            {validationMessage}
          </p>
        ) : null}
        {errorMessage ? (
          <p className={styles.alert} role="alert">
            {errorMessage}
          </p>
        ) : null}
        <div className={styles.actions}>
          <button disabled={isSubmitting} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? '创建中…' : '创建文件夹'}
          </button>
        </div>
      </form>
    </div>
  );
}
