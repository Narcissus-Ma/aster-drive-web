import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { useCopyOperation } from './use-copy-operation';

const resource: ResourceResponse = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'file',
  state: 'active',
  name: '报告.pdf',
  name_key: '报告.pdf',
  version: 3,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
};

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: React.ReactNode }): JSX.Element {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('复制操作 Hook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('二进制复制收到 202 后轮询到完成并暴露副本资源', async () => {
    let statusCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/copy') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'operation-a',
            operation_id: 'operation-a',
            progress: 0,
            status: 'pending',
          }),
          { status: 202, headers: { 'Content-Type': 'application/json' } },
        );
      }
      statusCalls += 1;
      const operation =
        statusCalls === 1
          ? {
              id: 'operation-a',
              operation_id: 'operation-a',
              progress: 42,
              status: 'pending',
            }
          : {
              id: 'operation-a',
              operation_id: 'operation-a',
              progress: 100,
              resource,
              status: 'succeeded',
            };
      return new Response(JSON.stringify(operation), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => useCopyOperation({ pollIntervalMs: 0 }), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.start(resource, { targetParentId: 'folder-b' });
    });

    await waitFor(() => expect(result.current.operation?.status).toBe('succeeded'));
    expect(result.current.operation?.resource?.id).toBe('resource-a');
    expect(statusCalls).toBe(2);
  });

  it('原生文档 201 直接完成且不发起状态轮询', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            id: 'operation-document',
            operation_id: 'operation-document',
            progress: 100,
            resource: { ...resource, kind: 'document' },
            status: 'succeeded',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const { result } = renderHook(() => useCopyOperation(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.start(resource, { targetParentId: 'folder-b' });
    });

    expect(result.current.operation?.status).toBe('succeeded');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
