import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ResourceRow } from './resource-row';

const rowResource = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'document' as const,
  state: 'active' as const,
  name: '项目计划',
  name_key: '项目计划',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  capabilities: { can_download: true },
};

describe('资源行收藏交互', () => {
  it('根据收藏状态切换按钮并通知上层 mutation', async () => {
    const onFavoriteToggle = vi.fn();
    const { rerender } = render(
      <ResourceRow
        onFavoriteToggle={onFavoriteToggle}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        resource={rowResource}
        selected={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '收藏 项目计划' }));
    expect(onFavoriteToggle).toHaveBeenCalledWith('resource-a', true);

    rerender(
      <ResourceRow
        favorite
        onFavoriteToggle={onFavoriteToggle}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        resource={rowResource}
        selected={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '取消收藏 项目计划' }));
    expect(onFavoriteToggle).toHaveBeenLastCalledWith('resource-a', false);
  });

  it('仅在 capability 允许时展示共享入口', async () => {
    const onShare = vi.fn();
    const { rerender } = render(
      <ResourceRow
        onOpen={vi.fn()}
        onShare={onShare}
        onToggle={vi.fn()}
        resource={{ ...rowResource, capabilities: { can_share: true } }}
        selected={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '文件操作' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '共享' }));
    expect(onShare).toHaveBeenCalledWith(expect.objectContaining({ id: 'resource-a' }));

    rerender(
      <ResourceRow
        onOpen={vi.fn()}
        onShare={onShare}
        onToggle={vi.fn()}
        resource={rowResource}
        selected={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: '文件操作' }));
    expect(screen.queryByRole('menuitem', { name: '共享' })).not.toBeInTheDocument();
  });
});
