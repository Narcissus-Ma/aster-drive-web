import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { CopyDialog, type CopyFolderOption } from './copy-dialog';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'file',
  state: 'active',
  name: '报告.pdf',
  name_key: '报告.pdf',
  version: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  capabilities: { can_download: true },
};

const folders: CopyFolderOption[] = [
  { id: 'root-a', name: '我的文件', parentId: null, kind: 'root' },
  { id: 'folder-b', name: '归档', parentId: 'root-a', kind: 'folder' },
];

describe('复制目标对话框', () => {
  it('选择目标目录和名称后提交复制请求', async () => {
    const onSubmit = vi.fn();
    render(
      <CopyDialog
        folders={folders}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        resource={resource}
      />,
    );

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '目标目录' }),
      'folder-b',
    );
    await userEvent.clear(screen.getByRole('textbox', { name: '副本名称' }));
    await userEvent.type(
      screen.getByRole('textbox', { name: '副本名称' }),
      '报告副本.pdf',
    );
    await userEvent.click(screen.getByRole('button', { name: '复制' }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: '报告副本.pdf',
      targetParentId: 'folder-b',
    });
  });

  it('文件夹复制显示不支持提示且不能提交', () => {
    render(
      <CopyDialog
        folders={folders}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        resource={{ ...resource, kind: 'folder', name: '资料' }}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('暂不支持复制文件夹');
    expect(screen.getByRole('button', { name: '复制' })).toBeDisabled();
  });
});
