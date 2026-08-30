import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CopyProgress } from './copy-progress';

describe('复制进度面板', () => {
  it('展示后台进度和失败详情', async () => {
    const onOpenResource = vi.fn();
    const onDismiss = vi.fn();
    const { rerender } = render(
      <CopyProgress
        onDismiss={onDismiss}
        onOpenResource={onOpenResource}
        operation={{
          id: 'operation-a',
          operation_id: 'operation-a',
          progress: 42,
          status: 'pending',
        }}
      />,
    );

    expect(screen.getByRole('progressbar', { name: '复制进度' })).toHaveValue(42);
    expect(screen.getByText('复制中')).toBeInTheDocument();

    rerender(
      <CopyProgress
        onDismiss={onDismiss}
        onOpenResource={onOpenResource}
        operation={{
          id: 'operation-a',
          operation_id: 'operation-a',
          last_error: '源文件已被清理',
          status: 'failed',
        }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('源文件已被清理');
    await userEvent.click(screen.getByRole('button', { name: '关闭' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('完成后提供打开副本入口', async () => {
    const onOpenResource = vi.fn();
    render(
      <CopyProgress
        onDismiss={vi.fn()}
        onOpenResource={onOpenResource}
        operation={{
          id: 'operation-a',
          operation_id: 'operation-a',
          progress: 100,
          resource: { id: 'resource-copy' },
          status: 'succeeded',
        }}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '打开副本' }));
    expect(onOpenResource).toHaveBeenCalledWith('resource-copy');
  });
});
