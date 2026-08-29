import { useEffect, useState, type FormEvent } from 'react';

import type { UploadTask } from '../models/upload-task';
import styles from './name-conflict-dialog.module.css';

export interface NameConflictDialogProps {
  task: UploadTask | null;
  onCancel: () => void;
  onSubmit: (task: UploadTask, name: string) => void | Promise<void>;
}

export function NameConflictDialog({
  onCancel,
  onSubmit,
  task,
}: NameConflictDialogProps): JSX.Element | null {
  const [name, setName] = useState(task?.name ?? '');
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(task?.name ?? '');
    setValidationMessage(null);
  }, [task]);

  if (!task) return null;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = name.trim();
    if (nextName.length === 0) {
      setValidationMessage('文件名不能为空');
      return;
    }
    if (nextName === task.name) {
      setValidationMessage('新文件名需要与原文件名不同');
      return;
    }
    void onSubmit(task, nextName);
  };

  return (
    <div
      aria-labelledby="name-conflict-title"
      aria-modal="true"
      className={styles.backdrop}
      role="dialog"
    >
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <h2 id="name-conflict-title">文件名冲突</h2>
        <p>“{task.name}”已存在，请为这次上传输入新名称。</p>
        <label htmlFor="conflict-name">新文件名</label>
        <input
          autoFocus
          id="conflict-name"
          onChange={(event) => setName(event.target.value)}
          value={name}
        />
        {validationMessage ? <p role="alert">{validationMessage}</p> : null}
        <div className={styles.actions}>
          <button type="button" onClick={onCancel}>
            取消
          </button>
          <button type="submit">使用新名称</button>
        </div>
      </form>
    </div>
  );
}
