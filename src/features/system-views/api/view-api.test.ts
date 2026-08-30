import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import {
  addFavorite,
  listSystemView,
  recordRecentAccess,
  removeFavorite,
  searchResources,
} from './view-api';

describe('系统视图 API', () => {
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('把收藏和最近列表的游标参数编码到请求地址', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await listSystemView({ view: 'favorites', cursor: 'next cursor', limit: 20 });
    await listSystemView({ view: 'recent', limit: 10 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/views/favorites?cursor=next%20cursor&limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/views/recent?limit=10',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('使用生成契约对应的方法调用收藏和最近访问 mutation', async () => {
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Response(
          JSON.stringify(
            init?.method === 'POST'
              ? {
                  id: 'resource-a',
                  name: '方案',
                  kind: 'document',
                  state: 'active',
                }
              : { status: 'ok' },
          ),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await addFavorite('resource-a');
    await removeFavorite('resource-a');
    await recordRecentAccess('resource-a');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/views/favorites/resource-a',
      expect.objectContaining({ method: 'PUT' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/views/favorites/resource-a',
      expect.objectContaining({ method: 'DELETE' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/views/recent/resource-a',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('组合搜索词、筛选、游标并保留取消信号', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const signal = new AbortController().signal;

    await searchResources({
      query: '预算 2026',
      kind: 'document',
      updatedFrom: '2026-01-01T00:00:00Z',
      updatedTo: '2026-02-01T00:00:00Z',
      cursor: 'next cursor',
      limit: 15,
      signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/search?q=%E9%A2%84%E7%AE%97%202026&kind=document&updated_from=2026-01-01T00%3A00%3A00Z&updated_to=2026-02-01T00%3A00%3A00Z&cursor=next%20cursor&limit=15',
      expect.objectContaining({ method: 'GET', signal }),
    );
  });
});
