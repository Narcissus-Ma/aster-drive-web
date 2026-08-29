import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { AuthSessionProvider } from '../../auth/hooks/use-auth-session';
import { AppShell } from '../../../app/layouts/app-shell';

describe('应用工作台布局', () => {
  it('提供退出登录入口', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <AuthSessionProvider restoreOnMount={false}>
          <MemoryRouter>
            <AppShell>
              <p>文件内容</p>
            </AppShell>
          </MemoryRouter>
        </AuthSessionProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('button', { name: '退出登录' })).toBeInTheDocument();
    expect(screen.getByText('文件内容')).toBeInTheDocument();
  });
});
