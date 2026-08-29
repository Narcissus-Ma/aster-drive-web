import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionProvider } from '../hooks/use-auth-session';
import { LoginForm } from './login-form';

function renderLoginForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthSessionProvider restoreOnMount={false}>
        <LoginForm />
      </AuthSessionProvider>
    </QueryClientProvider>,
  );
}

describe('登录表单', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('空表单提交时阻止请求并提示邮箱必填', async () => {
    const user = userEvent.setup();
    renderLoginForm();

    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(screen.getByLabelText('邮箱')).toBeInvalid();
    expect(screen.getByLabelText('密码')).toBeInvalid();
  });

  it('登录失败时展示统一错误文案', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 'AUTH_INVALID_CREDENTIALS',
            message: '邮箱或密码错误',
            request_id: 'req-login',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const user = userEvent.setup();
    renderLoginForm();

    await user.type(screen.getByLabelText('邮箱'), 'test@example.com');
    await user.type(screen.getByLabelText('密码'), 'wrong-password');
    await user.click(screen.getByRole('button', { name: '登录' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('邮箱或密码错误');
  });
});
