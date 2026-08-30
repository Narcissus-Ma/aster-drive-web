import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../../shared/api/api-client';
import { useFavoriteToggle, useSystemView } from './use-system-view';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function resource(id: string, name: string) {
  return {
    id,
    owner_id: 'owner-a',
    created_by: 'owner-a',
    parent_id: 'root-a',
    kind: 'document' as const,
    state: 'active' as const,
    name,
    name_key: name,
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    effective_role: 'owner',
    capabilities: { can_download: true },
  };
}

describe('系统视图查询 Hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('加载系统视图并按游标合并分页且去重', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const page = url.includes('cursor=next')
        ? { items: [resource('resource-b', '第二项')], next_cursor: null }
        : {
            items: [resource('resource-a', '第一项'), resource('resource-a', '第一项')],
            next_cursor: 'next',
          };
      return new Response(JSON.stringify(page), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useSystemView('favorites'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(result.current.hasNextPage).toBe(true);

    await act(async () => {
      await result.current.loadMore();
    });

    await waitFor(() => expect(result.current.items).toHaveLength(2));
    expect(result.current.items.map((item) => item.name)).toEqual(['第一项', '第二项']);
  });

  it('收藏取消失败时回滚乐观移除结果', async () => {
    let resolveDelete: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Promise<Response>((resolve) => {
          resolveDelete = resolve;
        });
      }
      return new Response(
        JSON.stringify({
          items: [resource('resource-a', '第一项')],
          next_cursor: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(
      () => ({ view: useSystemView('favorites'), toggle: useFavoriteToggle() }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.view.items).toHaveLength(1));
    let pending: Promise<unknown> | undefined;
    await act(async () => {
      pending = result.current.toggle.toggle('resource-a', true);
      void pending?.catch(() => undefined);
      await Promise.resolve();
    });
    await waitFor(() => expect(result.current.view.items).toHaveLength(0));
    await act(async () => {
      resolveDelete?.(
        new Response(
          JSON.stringify({
            code: 'temporary_failure',
            message: '暂时失败',
            request_id: 'request-a',
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });
    await expect(pending).rejects.toBeInstanceOf(ApiClientError);
    await waitFor(() => expect(result.current.view.items).toHaveLength(1));
  });
});
