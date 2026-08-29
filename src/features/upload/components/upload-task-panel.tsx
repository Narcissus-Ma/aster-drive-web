import { memo } from 'react';

import type { UploadTask, UploadTaskStatus } from '../models/upload-task';
import styles from './upload-task-panel.module.css';

export interface UploadTaskPanelProps {
  tasks: UploadTask[];
  onCancel: (taskId: string) => void | Promise<void>;
  onRetry: (taskId: string) => void | Promise<void>;
  onResolveNameConflict: (task: UploadTask) => void;
  onClearCompleted?: () => void;
}

const statusLabels: Record<UploadTaskStatus, string> = {
  waiting: '等待上传',
  uploading: '上传中',
  finalizing: '正在完成',
  completed: '已完成',
  failed: '失败',
  canceled: '已取消',
  'name-conflict': '需要处理名称冲突',
};

const activeStatuses = new Set<UploadTaskStatus>([
  'waiting',
  'uploading',
  'finalizing',
]);

interface UploadTaskRowProps {
  task: UploadTask;
  onCancel: UploadTaskPanelProps['onCancel'];
  onRetry: UploadTaskPanelProps['onRetry'];
  onResolveNameConflict: UploadTaskPanelProps['onResolveNameConflict'];
}

const UploadTaskRow = memo(function UploadTaskRow({
  onCancel,
  onResolveNameConflict,
  onRetry,
  task,
}: UploadTaskRowProps): JSX.Element {
  const canCancel = activeStatuses.has(task.status);
  const canRetry = task.status === 'failed' || task.status === 'canceled';
  const isConflict = task.status === 'name-conflict';

  return (
    <li className={styles.task}>
      <div className={styles.taskHeader}>
        <span className={styles.name} title={task.name}>
          {task.name}
        </span>
        <span className={styles.status}>{statusLabels[task.status]}</span>
      </div>
      <progress
        aria-label={task.name}
        className={styles.progress}
        max={100}
        value={task.progress}
      />
      <div className={styles.taskFooter}>
        <span className={styles.message} role={task.errorMessage ? 'alert' : undefined}>
          {task.errorMessage ?? `${task.progress}%`}
        </span>
        <div className={styles.actions}>
          {canCancel ? (
            <button type="button" onClick={() => void onCancel(task.id)}>
              取消{task.name}
            </button>
          ) : null}
          {canRetry ? (
            <button type="button" onClick={() => void onRetry(task.id)}>
              重试{task.name}
            </button>
          ) : null}
          {isConflict ? (
            <button type="button" onClick={() => onResolveNameConflict(task)}>
              解决冲突：{task.name}
            </button>
          ) : null}
        </div>
      </div>
    </li>
  );
});

export function UploadTaskPanel({
  onCancel,
  onClearCompleted,
  onResolveNameConflict,
  onRetry,
  tasks,
}: UploadTaskPanelProps): JSX.Element | null {
  if (tasks.length === 0) return null;

  const hasCompleted = tasks.some((task) => task.status === 'completed');
  return (
    <section
      aria-label="上传任务"
      className={styles.panel}
      data-testid="upload-task-panel"
    >
      <div className={styles.panelHeader}>
        <h2>上传任务</h2>
        {hasCompleted && onClearCompleted ? (
          <button type="button" onClick={onClearCompleted}>
            清理已完成
          </button>
        ) : null}
      </div>
      <ul className={styles.list}>
        {tasks.map((task) => (
          <UploadTaskRow
            key={task.id}
            onCancel={onCancel}
            onResolveNameConflict={onResolveNameConflict}
            onRetry={onRetry}
            task={task}
          />
        ))}
      </ul>
    </section>
  );
}
