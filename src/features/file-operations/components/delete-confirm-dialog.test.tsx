import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { DeleteConfirmDialog } from './delete-confirm-dialog';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'folder',
  state: 'active',
  name: '共享项目',
  name_key: '共享项目',
  version: 2,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('删除确认对话框', () => {
  it('显示共享结构根的权限提示', () => {
    render(
      <DeleteConfirmDialog
        errorMessage="共享结构根只能由所有者删除"
        mode="trash"
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
        resource={resource}
      />,
    );

    expect(screen.getByRole('dialog')).toHaveTextContent('共享项目');
    expect(screen.getByRole('alert')).toHaveTextContent('共享结构根只能由所有者删除');
  });

  it('永久删除需要二次确认并显示资源名', async () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        mode="purge"
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        resource={resource}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '继续永久删除' }));
    expect(screen.getByRole('status')).toHaveTextContent('共享项目');
    await userEvent.click(screen.getByRole('button', { name: '确认永久删除' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
