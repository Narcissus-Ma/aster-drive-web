import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './rename-dialog.module.css';

export interface RenameDialogProps {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void | Promise<void>;
  resource: ResourceResponse | null;
}

export function RenameDialog({
  errorMessage,
  isSubmitting = false,
  onCancel,
  onSubmit,
  resource,
}: RenameDialogProps): JSX.Element | null {
  const [name, setName] = useState(resource?.name ?? '');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const resourceId = resource?.id;
  const resourceName = resource?.name;

  useEffect(() => {
    if (!resourceId) return;
    setName(resourceName ?? '');
    setValidationMessage(null);
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    return () => previousFocusRef.current?.focus();
  }, [resourceId, resourceName]);

  if (!resource) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length === 0) {
      setValidationMessage('名称不能为空');
      return;
    }
    if (nextName === resource.name) {
      setValidationMessage('新名称需要与原名称不同');
      return;
    }
    setValidationMessage(null);
    void onSubmit(nextName);
  };

  return (
    <div
      aria-labelledby="rename-dialog-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <h2 id="rename-dialog-title">重命名</h2>
        <p>正在修改“{resource.name}”</p>
        <label htmlFor="rename-resource-name">新名称</label>
        <input
          ref={inputRef}
          aria-label="新名称"
          disabled={isSubmitting}
          id="rename-resource-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {validationMessage ? <p role="alert">{validationMessage}</p> : null}
        {errorMessage ? <p role="alert">{errorMessage}</p> : null}
        <div className={styles.actions}>
          <button disabled={isSubmitting} type="button" onClick={onCancel}>
            取消
          </button>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? '保存中…' : '保存名称'}
          </button>
        </div>
      </form>
    </div>
  );
}
