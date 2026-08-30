import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemViewPage } from './system-view-page';

function renderPage(view: 'favorites' | 'recent') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/${view}`]}>
        <SystemViewPage view={view} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('系统视图页面', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('展示收藏标题、资源和空态边界', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: [
                {
                  id: 'resource-a',
                  owner_id: 'owner-a',
                  created_by: 'owner-a',
                  parent_id: 'root-a',
                  kind: 'document',
                  state: 'active',
                  name: '项目预算',
                  name_key: '项目预算',
                  version: 1,
                  created_at: '2026-01-01T00:00:00Z',
                  updated_at: '2026-01-02T00:00:00Z',
                  effective_role: 'owner',
                  capabilities: { can_download: true },
                },
              ],
              next_cursor: null,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    renderPage('favorites');

    expect(
      await screen.findByRole('heading', { name: '我的收藏' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('项目预算')).toBeInTheDocument();
    expect(screen.queryByTestId('favorites-empty-state')).not.toBeInTheDocument();
  });
});
