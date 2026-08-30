import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { MovePickerDialog, type MoveFolderOption } from './move-picker-dialog';

const resource: ResourceResponse = {
  id: 'folder-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'folder',
  state: 'active',
  name: '项目资料',
  name_key: '项目资料',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

const folders: MoveFolderOption[] = [
  { id: 'root-a', name: '我的文件', parentId: null, kind: 'root' },
  { id: 'folder-a', name: '项目资料', parentId: 'root-a', kind: 'folder' },
  { id: 'folder-b', name: '项目资料/设计', parentId: 'folder-a', kind: 'folder' },
  { id: 'folder-c', name: '归档', parentId: 'root-a', kind: 'folder' },
];

describe('移动目录选择器', () => {
  it('禁用当前资源及其后代目录，允许选择其他目录', async () => {
    const onSubmit = vi.fn();
    render(
      <MovePickerDialog
        folders={folders}
        onCancel={vi.fn()}
        onSubmit={onSubmit}
        resource={resource}
      />,
    );

    expect(screen.getByRole('option', { name: /项目资料（不可选）/ })).toBeDisabled();
    expect(
      screen.getByRole('option', { name: /项目资料\/设计（不可选）/ }),
    ).toBeDisabled();

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '目标目录' }),
      'folder-c',
    );
    await userEvent.click(screen.getByRole('button', { name: '移动' }));

    expect(onSubmit).toHaveBeenCalledWith('folder-c');
  });
});
