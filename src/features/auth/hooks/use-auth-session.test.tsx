import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import { AuthSessionProvider, useAuthSession } from './use-auth-session';

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }): JSX.Element {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryClientProvider>
    );
  };
}

describe('认证会话恢复', () => {
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('刷新失败时回到匿名状态并清理用户级缓存', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 'AUTH_REFRESH_INVALID',
            message: '会话已失效',
            request_id: 'req-refresh',
          }),
          {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken('stale-token');
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private', 'files'], [{ id: 'file-1' }]);

    const { result } = renderHook(() => useAuthSession(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.status).toBe('anonymous'));

    expect(apiClient.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(['private', 'files'])).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
