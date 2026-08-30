import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { ResourceRow } from '../../files/components/resource-row';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'file',
  state: 'active',
  name: '报告.pdf',
  name_key: '报告.pdf',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  capabilities: { can_download: true },
};

describe('资源行复制入口', () => {
  it('有下载能力时展示复制并通知上层', async () => {
    const onCopy = vi.fn();
    render(
      <ResourceRow
        onCopy={onCopy}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        resource={resource}
        selected={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '文件操作' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '复制到' }));

    expect(onCopy).toHaveBeenCalledWith(resource);
  });

  it('没有下载能力时不展示复制入口', async () => {
    render(
      <ResourceRow
        onCopy={vi.fn()}
        onOpen={vi.fn()}
        onToggle={vi.fn()}
        resource={{ ...resource, capabilities: { can_share: true } }}
        selected={false}
      />,
    );

    await userEvent.click(screen.getByRole('button', { name: '文件操作' }));
    expect(screen.queryByRole('menuitem', { name: '复制到' })).not.toBeInTheDocument();
  });
});
