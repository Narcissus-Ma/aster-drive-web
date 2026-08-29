import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import { listFolderChildren } from './resource-api';

describe('资源 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('将目录筛选、排序和游标编码到 children 请求', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await listFolderChildren({
      parentId: 'root id',
      kind: 'folder',
      updatedFrom: '2026-01-01T00:00:00Z',
      updatedTo: '2026-02-01T00:00:00Z',
      sortBy: 'updated_at',
      sortDirection: 'desc',
      cursor: 'next cursor',
      limit: 20,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/v1/resources/root%20id/children?kind=folder&updated_from=2026-01-01T00%3A00%3A00Z&updated_to=2026-02-01T00%3A00%3A00Z&sort_by=updated_at&sort_direction=desc&cursor=next%20cursor&limit=20',
      ),
      expect.objectContaining({ method: 'GET' }),
    );
    expect(apiClient.getAccessToken()).toBeNull();
  });
});
