import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileWorkspace } from './file-workspace';

function resource(overrides: Record<string, unknown> = {}) {
  return {
    id: 'folder-a',
    owner_id: 'owner-a',
    created_by: 'owner-a',
    parent_id: 'root-a',
    kind: 'folder',
    state: 'active',
    name: '项目资料',
    name_key: '项目资料',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    effective_role: 'viewer',
    capabilities: {
      can_edit_content: false,
      can_rename: false,
      can_move: false,
      can_trash: false,
      can_share: false,
      can_download: true,
      can_accept_children: false,
    },
    ...overrides,
  };
}

function LocationProbe() {
  const location = useLocation();
  return (
    <output data-testid="location">{`${location.pathname}${location.search}`}</output>
  );
}

function HistoryControls() {
  const navigate = useNavigate();
  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>
        后退
      </button>
      <button type="button" onClick={() => navigate(1)}>
        前进
      </button>
    </div>
  );
}

function renderWorkspace(initialEntry = '/drive/root-a') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/drive/:folderId" element={<FileWorkspace />} />
        </Routes>
        <LocationProbe />
        <HistoryControls />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('文件工作区', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('根据后端 capabilities 禁用结构操作', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [resource()], next_cursor: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: '更多操作' }));

    expect(screen.getByRole('menuitem', { name: '重命名' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('menuitem', { name: '移动到' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('把排序和类型筛选写入 URL', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [], next_cursor: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    renderWorkspace();

    await userEvent.selectOptions(
      await screen.findByRole('combobox', { name: '排序字段' }),
      'updated_at',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '排序方向' }),
      'desc',
    );
    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: '资源类型' }),
      'folder',
    );

    expect(screen.getByTestId('location')).toHaveTextContent(
      '/drive/root-a?kind=folder&sort_by=updated_at&sort_direction=desc',
    );

    fireEvent.change(screen.getByLabelText('更新时间起'), {
      target: { value: '2026-01-01T00:00' },
    });
    expect(screen.getByTestId('location')).toHaveTextContent(
      '/drive/root-a?kind=folder&updated_from=2026-01-01T00%3A00&sort_by=updated_at&sort_direction=desc',
    );
  });

  it('打开目录后支持路由前进和后退', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [resource()], next_cursor: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: /项目资料/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/drive/folder-a');

    await userEvent.click(screen.getByRole('button', { name: '后退' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/drive/root-a');

    await userEvent.click(screen.getByRole('button', { name: '前进' }));
    expect(screen.getByTestId('location')).toHaveTextContent('/drive/folder-a');
  });

  it('点击文件后打开预览抽屉', async () => {
    const image = resource({
      id: 'file-a',
      kind: 'file',
      name: '照片.png',
      name_key: '照片.png',
      declared_mime: 'image/png',
      object_key: 'objects/photo',
    });
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/content/file-a/preview')) {
        return new Response(
          JSON.stringify({
            resource_id: 'file-a',
            filename: '照片.png',
            declared_mime: 'image/png',
            detected_mime: 'image/png',
            mime_type: 'image/png',
            size_bytes: 128,
            etag: 'etag-a',
            disposition: 'inline',
            previewable: true,
            url: 'https://objects.example/photo.png?signature=test',
            expires_at: '2026-08-30T12:05:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        );
      }
      return new Response(JSON.stringify({ items: [image], next_cursor: null }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: /照片.png/ }));

    expect(await screen.findByRole('img', { name: '照片.png' })).toHaveAttribute(
      'src',
      expect.stringContaining('photo.png'),
    );
  });

  it('点击文档后进入原生编辑器路由', async () => {
    const document = resource({
      id: 'document-a',
      kind: 'document',
      name: '项目笔记',
      name_key: '项目笔记',
      capabilities: {
        can_download: true,
        can_edit_content: true,
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ items: [document], next_cursor: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
      ),
    );
    renderWorkspace();

    await userEvent.click(await screen.findByRole('button', { name: /项目笔记/ }));

    expect(screen.getByTestId('location')).toHaveTextContent('/documents/document-a');
  });

  it('版本冲突后刷新资源并保留重命名对话框输入', async () => {
    const editableResource = resource({
      capabilities: {
        can_accept_children: true,
        can_download: true,
        can_edit_content: false,
        can_move: true,
        can_rename: true,
        can_share: true,
        can_trash: true,
      },
    });
    const updatedResource = { ...editableResource, version: 2 };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === 'PATCH') {
        return new Response(
          JSON.stringify({
            code: 'resource_version_conflict',
            fields: { current_version: 2 },
            message: '资源版本已过期',
            request_id: 'request-a',
          }),
          { status: 409, headers: { 'Content-Type': 'application/json' } },
        );
      }
      if (url.endsWith('/folder-a') && init?.method === 'GET') {
        return new Response(JSON.stringify(updatedResource), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(
        JSON.stringify({ items: [updatedResource], next_cursor: null }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    renderWorkspace();

    await userEvent.click(
      await screen.findByRole('checkbox', { name: '选择 项目资料' }),
    );
    await userEvent.click(screen.getByRole('button', { name: '更多操作' }));
    await userEvent.click(screen.getByRole('menuitem', { name: '重命名' }));
    const input = screen.getByRole('textbox', { name: '新名称' });
    await userEvent.clear(input);
    await userEvent.type(input, '冲突后的名称');
    await userEvent.click(screen.getByRole('button', { name: '保存名称' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('资源已被其他操作更新');
    });
    expect(screen.getByRole('textbox', { name: '新名称' })).toHaveValue('冲突后的名称');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/resources/folder-a',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
