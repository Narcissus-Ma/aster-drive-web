import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePreviewResource } from './use-preview-resource';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function previewResponse(overrides: Record<string, unknown> = {}) {
  return {
    resource_id: 'resource-a',
    filename: '说明.txt',
    declared_mime: 'text/plain',
    detected_mime: 'text/plain',
    mime_type: 'text/plain',
    size_bytes: 12,
    etag: 'etag-a',
    disposition: 'inline' as const,
    previewable: true,
    url: 'https://objects.example/readme.txt?signature=test',
    expires_at: '2026-08-30T12:05:00Z',
    ...overrides,
  };
}

describe('预览资源 Hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('读取文本内容并把查询取消信号传给请求', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      if (String(input).startsWith('/api/v1/content/')) {
        return new Response(JSON.stringify(previewResponse()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('第一行\n第二行', {
        status: 200,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(() => usePreviewResource('resource-a'), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.text).toBe('第一行\n第二行'));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('拒绝超过上限的文本内容', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      if (String(input).startsWith('/api/v1/content/')) {
        return new Response(JSON.stringify(previewResponse({ size_bytes: 8 })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response('12345678', { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    const { result } = renderHook(
      () => usePreviewResource('resource-a', { maxTextBytes: 4 }),
      { wrapper: createWrapper(queryClient) },
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(
      expect.objectContaining({ code: 'preview_too_large' }),
    );
  });
});
