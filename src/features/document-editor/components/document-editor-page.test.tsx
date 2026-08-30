import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DocumentEditorPage } from './document-editor-page';

const documentContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '初始内容' }] }],
};

function renderPage(resourceId = 'resource-a') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/documents/${resourceId}`]}>
        <Routes>
          <Route
            path="/documents/:resourceId"
            element={
              <DocumentEditorPage resourceId={resourceId} resourceName="项目笔记" />
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('文档编辑器页面', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('viewer 只能读取且编辑器为只读', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              resource_id: 'resource-a',
              content: documentContent,
              revision: 1,
              content_hash: 'hash-a',
              effective_role: 'viewer',
              capabilities: { can_download: true, can_edit_content: false },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
      ),
    );

    renderPage();

    const editor = await screen.findByRole('textbox', { name: '文档编辑区' });
    expect(editor).toHaveAttribute('contenteditable', 'false');
    expect(screen.getByRole('button', { name: '加粗' })).toBeDisabled();
    expect(screen.getByText('只读')).toBeInTheDocument();
  });

  it('editor 修改内容后触发自动保存并显示已保存', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (
        String(input).includes('/api/v1/documents/resource-a') &&
        init?.method === 'PUT'
      ) {
        return new Response(
          JSON.stringify({
            resource_id: 'resource-a',
            content: documentContent,
            revision: 2,
            content_hash: 'hash-b',
            effective_role: 'editor',
            capabilities: { can_download: true, can_edit_content: true },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(
        JSON.stringify({
          resource_id: 'resource-a',
          content: documentContent,
          revision: 1,
          content_hash: 'hash-a',
          effective_role: 'editor',
          capabilities: { can_download: true, can_edit_content: true },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      );
    });
    vi.stubGlobal('fetch', fetchMock);

    renderPage();
    const editor = await screen.findByRole('textbox', { name: '文档编辑区' });
    await userEvent.click(editor);
    await userEvent.type(editor, ' 新内容');

    await waitFor(() => expect(screen.getByText('已保存')).toBeInTheDocument(), {
      timeout: 3000,
    });
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) =>
          String(input).includes('/api/v1/documents/resource-a') &&
          init?.method === 'PUT',
      ),
    ).toBe(true);
  });
});
