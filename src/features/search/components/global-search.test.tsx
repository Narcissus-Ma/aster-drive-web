import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GlobalSearch } from './global-search';

function LocationText(): JSX.Element {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe('全局搜索入口', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('从 URL 恢复筛选并在打开结果时记录最近访问', async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return new Response(
          JSON.stringify({
            id: 'resource-a',
            owner_id: 'owner-a',
            created_by: 'owner-a',
            parent_id: 'root-a',
            kind: 'document',
            state: 'active',
            name: '项目计划',
            name_key: '项目计划',
            version: 1,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-02T00:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          items: [
            {
              id: 'resource-a',
              owner_id: 'owner-a',
              created_by: 'owner-a',
              parent_id: 'root-a',
              kind: 'document',
              state: 'active',
              name: '项目计划',
              name_key: '项目计划',
              version: 1,
              created_at: '2026-01-01T00:00:00Z',
              updated_at: '2026-01-02T00:00:00Z',
              capabilities: { can_download: true },
            },
          ],
          next_cursor: null,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/drive?q=项目&kind=document']}>
          <GlobalSearch />
          <LocationText />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole('searchbox', { name: '全局搜索' })).toHaveValue('项目');
    expect(screen.getByRole('combobox', { name: '资源类型' })).toHaveValue('document');
    act(() => {
      vi.advanceTimersByTime(300);
    });
    vi.useRealTimers();

    const result = await screen.findByRole('option', { name: /项目计划/ });
    await userEvent.click(result);

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/views/recent/resource-a',
        expect.objectContaining({ method: 'POST' }),
      ),
    );
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/drive/root-a'),
    );
  });
});
