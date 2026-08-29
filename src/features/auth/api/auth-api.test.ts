import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('认证请求客户端', () => {
  beforeEach(() => {
    apiClient.clearAccessToken();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('并发 401 只发送一次刷新请求并重放原请求', async () => {
    let refreshCalls = 0;
    let userCalls = 0;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      void init;
      const url = String(input);
      await new Promise<void>((resolve) => queueMicrotask(resolve));

      if (url.endsWith('/api/v1/auth/refresh')) {
        refreshCalls += 1;
        return jsonResponse({
          access_token: 'fresh-token',
          expires_in: 900,
          token_type: 'bearer',
        });
      }

      if (url.endsWith('/api/v1/users/me')) {
        userCalls += 1;
        if (userCalls <= 3) {
          return jsonResponse(
            {
              code: 'AUTH_TOKEN_INVALID',
              message: '登录状态已失效',
              request_id: `req-${userCalls}`,
            },
            401,
          );
        }
        return jsonResponse({
          id: '00000000-0000-0000-0000-000000000001',
          email: 'test@example.com',
          display_name: '测试用户',
          status: 'active',
        });
      }

      throw new Error(`未处理的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken('expired-token');

    const users = await Promise.all([
      apiClient.request('/api/v1/users/me'),
      apiClient.request('/api/v1/users/me'),
      apiClient.request('/api/v1/users/me'),
    ]);

    expect(refreshCalls).toBe(1);
    expect(userCalls).toBe(6);
    expect(users).toHaveLength(3);
    expect(apiClient.getAccessToken()).toBe('fresh-token');

    const refreshRequest = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/api/v1/auth/refresh'),
    );
    expect(refreshRequest?.[1]).toMatchObject({ credentials: 'include' });
    expect(new Headers(refreshRequest?.[1]?.headers).has('Authorization')).toBe(false);
  });

  it('刷新失败时通知会话失效监听器', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 'AUTH_REFRESH_INVALID',
            message: '会话已失效',
            request_id: 'req-refresh',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken('expired-token');
    const onRefreshFailure = vi.fn();
    const unsubscribe = apiClient.onRefreshFailure(onRefreshFailure);

    await expect(apiClient.request('/api/v1/users/me')).rejects.toMatchObject({
      status: 401,
    });

    expect(onRefreshFailure).toHaveBeenCalledTimes(1);
    unsubscribe();
  });
});
