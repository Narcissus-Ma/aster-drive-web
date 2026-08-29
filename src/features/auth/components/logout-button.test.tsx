import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import { AuthSessionProvider } from '../hooks/use-auth-session';
import { LogoutButton } from './logout-button';

describe('退出按钮', () => {
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('退出后清理内存 token 和用户级 Query 缓存', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: 'logged_out' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken('memory-token');
    const queryClient = new QueryClient();
    queryClient.setQueryData(['private', 'profile'], { email: 'test@example.com' });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider restoreOnMount={false}>
          <MemoryRouter>
            <LogoutButton />
          </MemoryRouter>
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: '退出登录' }));

    expect(apiClient.getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(['private', 'profile'])).toBeUndefined();
  });
});
