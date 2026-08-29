import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionProvider } from '../../features/auth/hooks/use-auth-session';
import { apiClient } from '../../shared/api/api-client';
import { LoginPage } from './login-page';

describe('登录页面', () => {
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('登录成功后跳转到工作台路由', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/login')) {
        return new Response(
          JSON.stringify({ access_token: 'fresh-token', expires_in: 900 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/api/v1/users/me')) {
        return new Response(
          JSON.stringify({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'test@example.com',
            display_name: '测试用户',
            status: 'active',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`未处理的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider restoreOnMount={false}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<p>工作台路由</p>} />
            </Routes>
          </MemoryRouter>
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
    await user.type(screen.getByLabelText('密码'), 'correct-password');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByText('工作台路由')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('恢复请求晚返回时不清理新登录态', async () => {
    let resolveRefresh: ((response: Response) => void) | undefined;
    const refreshPending = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/api/v1/auth/refresh')) {
        return refreshPending;
      }
      if (url.endsWith('/api/v1/auth/login')) {
        return new Response(
          JSON.stringify({ access_token: 'login-token', expires_in: 900 }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/api/v1/users/me')) {
        return new Response(
          JSON.stringify({
            id: '00000000-0000-0000-0000-000000000001',
            email: 'test@example.com',
            display_name: '测试用户',
            status: 'active',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      throw new Error(`未处理的请求：${url}`);
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient();
    const user = userEvent.setup();

    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/" element={<p>工作台路由</p>} />
            </Routes>
          </MemoryRouter>
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
    await user.type(screen.getByLabelText('密码'), 'correct-password');
    await user.click(screen.getByRole('button', { name: '登录' }));
    expect(await screen.findByText('工作台路由')).toBeInTheDocument();
    expect(apiClient.getAccessToken()).toBe('login-token');

    await act(async () => {
      resolveRefresh?.(
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
      await Promise.resolve();
    });

    expect(apiClient.getAccessToken()).toBe('login-token');
    expect(screen.getByText('工作台路由')).toBeInTheDocument();
  });
});
