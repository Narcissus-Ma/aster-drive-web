import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { TrashPage } from './trash-page';

function trashResource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'resource-a',
    owner_id: 'owner-a',
    created_by: 'owner-a',
    parent_id: 'root-a',
    kind: 'document',
    state: 'trash',
    name: '会议纪要',
    name_key: '会议纪要',
    version: 7,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    deleted_at: '2026-01-03T00:00:00Z',
    ...overrides,
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TrashPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('回收站页面', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('恢复资源时传递当前版本', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/trash') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ items: [trashResource()], next_cursor: null }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/restore')) {
        return new Response(
          JSON.stringify(trashResource({ state: 'active', version: 8 })),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: '恢复会议纪要' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/resources/resource-a/restore',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ version: 7 }),
        }),
      );
    });
  });

  it('恢复重名时打开冲突对话框并保留回收站页面', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/trash') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ items: [trashResource()], next_cursor: null }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/restore')) {
        return new Response(
          JSON.stringify({
            code: 'name_conflict',
            message: '同一目录下已存在同名资源',
            request_id: 'request-a',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(await screen.findByRole('button', { name: '恢复会议纪要' }));

    expect(await screen.findByRole('dialog')).toHaveTextContent('名称冲突');
    expect(screen.getByTestId('trash-page')).toBeInTheDocument();
  });

  it('永久删除要求二次确认并传递当前版本', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/trash') && (!init?.method || init.method === 'GET')) {
        return new Response(
          JSON.stringify({ items: [trashResource()], next_cursor: null }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      if (url.endsWith('/purge')) {
        return new Response(
          JSON.stringify(trashResource({ state: 'purge_pending', version: 8 })),
          {
            status: 202,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(JSON.stringify({ items: [], next_cursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderPage();

    await userEvent.click(
      await screen.findByRole('button', { name: '永久删除会议纪要' }),
    );
    await userEvent.click(screen.getByRole('button', { name: '继续永久删除' }));
    await userEvent.click(screen.getByRole('button', { name: '确认永久删除' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/v1/resources/resource-a/purge',
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify({ version: 7 }),
        }),
      );
    });
  });
});
