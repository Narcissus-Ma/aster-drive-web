import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useResourceSearch } from './use-resource-search';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function searchPage(name: string) {
  return {
    items: [
      {
        id: name,
        owner_id: 'owner-a',
        created_by: 'owner-a',
        parent_id: 'root-a',
        kind: 'document',
        state: 'active',
        name,
        name_key: name,
        version: 1,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-02T00:00:00Z',
        effective_role: 'owner',
        capabilities: { can_download: true },
      },
    ],
    next_cursor: null,
  };
}

describe('全局搜索 Hook', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('等待 300ms 防抖并只展示最后一次搜索结果', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      const name = url.includes('q=%E8%AE%BE%E8%AE%A1%E6%96%B9%E6%A1%88')
        ? '项目设计方案'
        : '旧结果';
      return new Response(JSON.stringify(searchPage(name)), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result, rerender } = renderHook(
      ({ query }) => useResourceSearch({ query }),
      {
        initialProps: { query: '设计' },
        wrapper: createWrapper(queryClient),
      },
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    rerender({ query: '设计方案' });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();

    await waitFor(() =>
      expect(result.current.items.map((item) => item.name)).toEqual(['项目设计方案']),
    );
  });
});
