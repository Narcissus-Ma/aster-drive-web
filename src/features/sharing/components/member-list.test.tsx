import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { GrantResponse } from '../../../shared/api/generated/openapi';
import { MemberList } from './member-list';

const member: GrantResponse = {
  id: 'grant-a',
  resource_id: 'resource-a',
  grantee_user_id: 'user-b',
  granted_by: 'owner-a',
  role: 'viewer',
  created_at: '2026-08-30T00:00:00Z',
};

describe('共享成员列表', () => {
  it('展示成员角色并在具备共享能力时支持改权和撤销', async () => {
    const onRoleChange = vi.fn();
    const onRevoke = vi.fn();
    render(
      <MemberList
        canShare
        members={[member]}
        onRevoke={onRevoke}
        onRoleChange={onRoleChange}
      />,
    );

    await userEvent.selectOptions(
      screen.getByLabelText('为 user-b 设置权限'),
      'editor',
    );
    await userEvent.click(screen.getByRole('button', { name: '撤销 user-b' }));

    expect(onRoleChange).toHaveBeenCalledWith('user-b', 'editor');
    expect(onRevoke).toHaveBeenCalledWith('user-b');
  });

  it('无共享能力时隐藏成员管理控件', () => {
    render(<MemberList canShare={false} members={[member]} />);

    expect(screen.queryByLabelText('为 user-b 设置权限')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: '撤销 user-b' }),
    ).not.toBeInTheDocument();
    expect(screen.getByText('user-b')).toBeInTheDocument();
  });
});
