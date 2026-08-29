import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { createUploadTask } from '../models/upload-task';
import { NameConflictDialog } from './name-conflict-dialog';

describe('名称冲突对话框', () => {
  it('提交新名称并支持取消', async () => {
    const onCancel = vi.fn();
    const onSubmit = vi.fn();
    const task = createUploadTask(new File(['内容'], '报告.txt'), 'folder-1');

    render(<NameConflictDialog onCancel={onCancel} onSubmit={onSubmit} task={task} />);

    const input = screen.getByRole('textbox', { name: '新文件名' });
    await userEvent.clear(input);
    await userEvent.type(input, '报告 2.txt');
    await userEvent.click(screen.getByRole('button', { name: '使用新名称' }));
    await userEvent.click(screen.getByRole('button', { name: '取消' }));

    expect(onSubmit).toHaveBeenCalledWith(task, '报告 2.txt');
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
