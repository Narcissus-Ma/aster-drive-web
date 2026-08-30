import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { RestoreConflictDialog } from './restore-conflict-dialog';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'document',
  state: 'trash',
  name: '会议纪要',
  name_key: '会议纪要',
  version: 4,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('恢复冲突对话框', () => {
  it('支持关闭和重试恢复', async () => {
    const onCancel = vi.fn();
    const onRetry = vi.fn();
    render(
      <RestoreConflictDialog
        onCancel={onCancel}
        onRetry={onRetry}
        resource={resource}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('会议纪要');
    await userEvent.click(screen.getByRole('button', { name: '重试恢复' }));
    await userEvent.click(screen.getByRole('button', { name: '关闭' }));

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
