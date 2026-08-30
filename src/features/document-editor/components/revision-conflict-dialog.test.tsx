import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RevisionConflictDialog } from './revision-conflict-dialog';

describe('文档版本冲突对话框', () => {
  it('提供加载最新版本和另存为副本两个恢复动作', () => {
    const onReload = vi.fn();
    const onSaveAsCopy = vi.fn();

    render(
      <RevisionConflictDialog open onReload={onReload} onSaveAsCopy={onSaveAsCopy} />,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('文档已被其他窗口更新');
    fireEvent.click(screen.getByRole('button', { name: '加载最新版本' }));
    fireEvent.click(screen.getByRole('button', { name: '另存为副本' }));

    expect(onReload).toHaveBeenCalledTimes(1);
    expect(onSaveAsCopy).toHaveBeenCalledTimes(1);
  });
});
