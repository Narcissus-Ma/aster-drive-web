import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../../shared/api/api-client';
import { recoverResourceAccessError, useFolderChildren } from './use-folder-children';

function page(name: string, nextCursor: string | null = null) {
  return {
    items: [
      {
        id: name,
        owner_id: 'owner-a',
        created_by: 'owner-a',
        parent_id: 'root-a',
        kind: 'folder',
        state: 'active',
        name,
        name_key: name,
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        capabilities: { can_download: true },
      },
    ],
    next_cursor: nextCursor,
  };
}

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drive/root-a']}>{children}</MemoryRouter>
      </QueryClientProvider>
    );
  };
}

describe('目录 children 查询', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('按游标加载并合并分页资源且去重', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const firstPage = page('第一页', 'next');
      firstPage.items.push(page('重复项').items[0]);
      return new Response(
        JSON.stringify(url.includes('cursor=next') ? page('第二页') : firstPage),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () =>
        useFolderChildren({ parentId: 'root-a', sortBy: 'name', sortDirection: 'asc' }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(3));
    expect(result.current.items.map((item) => item.name)).toEqual([
      '第一页',
      '重复项',
      '第二页',
    ]);
  });

  it('资源返回 404 时清理失效缓存并导航到父目录', async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['resources', 'children'], { pages: [], pageParams: [] });
    const navigate = vi.fn();

    await recoverResourceAccessError({
      error: new ApiClientError('资源不存在', { status: 404 }),
      navigate,
      parentId: 'parent-folder',
      queryClient,
      resourceId: 'missing-resource',
    });

    expect(queryClient.getQueryData(['resources', 'children'])).toBeUndefined();
    expect(navigate).toHaveBeenCalledWith('/drive/parent-folder', { replace: true });
  });

  it('加载失败后不自动重试，避免失效目录持续请求', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ detail: '资源不存在' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retryDelay: 1 } },
    });

    const { result } = renderHook(
      () => useFolderChildren({ parentId: 'missing-folder' }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('已经处于 fallback 路径时不重复导航', async () => {
    const queryClient = new QueryClient();
    const navigate = vi.fn();

    await recoverResourceAccessError({
      error: new ApiClientError('资源不存在', { status: 404 }),
      currentPath: '/drive',
      fallbackPath: '/drive',
      navigate,
      parentId: 'missing-root',
      queryClient,
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('资源返回 403 时重新获取 detail 和 capabilities', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'folder-a',
            owner_id: 'owner-a',
            created_by: 'owner-a',
            parent_id: null,
            kind: 'folder',
            state: 'active',
            name: '项目资料',
            name_key: '项目资料',
            version: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
            capabilities: { can_rename: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();

    const detail = await recoverResourceAccessError({
      error: new ApiClientError('权限已变化', { status: 403 }),
      parentId: 'folder-a',
      queryClient,
    });

    expect(detail?.capabilities?.can_rename).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/resources/folder-a',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
