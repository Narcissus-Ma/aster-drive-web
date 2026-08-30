import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SearchResultList } from './search-result-list';

describe('搜索结果列表', () => {
  it('展示结果并把打开动作交给页面组合层', async () => {
    const onOpen = vi.fn();
    render(
      <SearchResultList
        items={[
          {
            id: 'resource-a',
            owner_id: 'owner-a',
            created_by: 'owner-a',
            parent_id: 'root-a',
            kind: 'document',
            state: 'active',
            name: '项目计划',
            name_key: '项目计划',
            version: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            capabilities: { can_download: true },
          },
        ]}
        isLoading={false}
        onOpen={onOpen}
      />,
    );

    await userEvent.click(screen.getByRole('option', { name: /项目计划/ }));

    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'resource-a' }));
  });
});
