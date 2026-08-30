import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { RenameDialog } from './rename-dialog';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'folder',
  state: 'active',
  name: '项目资料',
  name_key: '项目资料',
  version: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

describe('重命名对话框', () => {
  it('提交去除首尾空格的名称', async () => {
    const onSubmit = vi.fn();
    render(<RenameDialog onCancel={vi.fn()} onSubmit={onSubmit} resource={resource} />);

    const input = screen.getByRole('textbox', { name: '新名称' });
    await userEvent.clear(input);
    await userEvent.type(input, '  新名称  ');
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(onSubmit).toHaveBeenCalledWith('新名称');
  });

  it('发生重名错误时保留用户输入', async () => {
    const { rerender } = render(
      <RenameDialog onCancel={vi.fn()} onSubmit={vi.fn()} resource={resource} />,
    );
    const input = screen.getByRole('textbox', { name: '新名称' });
    await userEvent.clear(input);
    await userEvent.type(input, '冲突后的名称');

    rerender(
      <RenameDialog
        errorMessage="同一目录下已存在同名资源，请输入其他名称"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        resource={resource}
      />,
    );

    expect(screen.getByRole('textbox', { name: '新名称' })).toHaveValue('冲突后的名称');
    expect(screen.getByRole('alert')).toHaveTextContent('同一目录下已存在同名资源');
  });
});
