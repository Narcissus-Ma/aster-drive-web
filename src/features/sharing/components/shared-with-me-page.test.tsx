import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { SharedWithMePage } from './shared-with-me-page';

vi.mock('../hooks/use-sharing', () => ({
  useSharedWithMe: vi.fn(() => ({
    error: null,
    hasNextPage: false,
    isError: false,
    isFetchingNextPage: false,
    isLoading: false,
    items: [
      {
        resource: {
          id: 'resource-a',
          owner_id: 'owner-a',
          created_by: 'owner-a',
          parent_id: null,
          kind: 'document',
          state: 'active',
          name: '共享文档',
          name_key: '共享文档',
          version: 1,
          created_at: '2026-08-30T00:00:00Z',
          updated_at: '2026-08-30T00:00:00Z',
          capabilities: { can_download: true },
        },
        grant: {
          id: 'grant-a',
          resource_id: 'resource-a',
          grantee_user_id: 'user-b',
          granted_by: 'owner-a',
          role: 'viewer',
          created_at: '2026-08-30T00:00:00Z',
        },
        effective_role: 'viewer',
        capabilities: { can_download: true },
      },
    ],
    loadMore: vi.fn(),
    refetch: vi.fn(),
  })),
}));

describe('与我共享页面', () => {
  it('展示服务器投影的共享资源和权限', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <SharedWithMePage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('heading', { name: '与我共享' })).toBeInTheDocument();
    expect(screen.getByText('共享文档')).toBeInTheDocument();
    expect(screen.getByText('查看')).toBeInTheDocument();
  });
});
