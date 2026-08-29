import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createUploadTask } from '../models/upload-task';
import { UploadTaskPanel } from './upload-task-panel';

describe('上传任务面板', () => {
  it('展示进度、状态和对应操作', async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    const onResolveNameConflict = vi.fn();
    const uploadingTask = createUploadTask(
      new File(['内容'], '正在上传.txt'),
      'folder-1',
    );
    uploadingTask.status = 'uploading';
    uploadingTask.progress = 45;
    const failedTask = createUploadTask(new File(['内容'], '失败.txt'), 'folder-1');
    failedTask.status = 'failed';
    failedTask.errorMessage = '网络不可用';
    const conflictTask = createUploadTask(new File(['内容'], '冲突.txt'), 'folder-1');
    conflictTask.status = 'name-conflict';

    render(
      <UploadTaskPanel
        onCancel={onCancel}
        onRetry={onRetry}
        onResolveNameConflict={onResolveNameConflict}
        tasks={[uploadingTask, failedTask, conflictTask]}
      />,
    );

    expect(screen.getByRole('progressbar', { name: '正在上传.txt' })).toHaveValue(45);
    expect(screen.getByText('上传中')).toBeInTheDocument();
    expect(screen.getByText('网络不可用')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: '取消正在上传.txt' }));
    await userEvent.click(screen.getByRole('button', { name: '重试失败.txt' }));
    await userEvent.click(screen.getByRole('button', { name: '解决冲突：冲突.txt' }));

    expect(onCancel).toHaveBeenCalledWith(uploadingTask.id);
    expect(onRetry).toHaveBeenCalledWith(failedTask.id);
    expect(onResolveNameConflict).toHaveBeenCalledWith(conflictTask);
  });
});
