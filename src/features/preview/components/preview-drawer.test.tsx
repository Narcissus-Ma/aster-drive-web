import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePreviewResource } from '../hooks/use-preview-resource';
import { PreviewDrawer } from './preview-drawer';

vi.mock('../hooks/use-preview-resource', () => ({
  usePreviewResource: vi.fn(),
}));

const mockedUsePreviewResource = vi.mocked(usePreviewResource);

function resource(overrides: Record<string, unknown> = {}): ResourceResponse {
  return {
    id: 'resource-a',
    owner_id: 'owner-a',
    created_by: 'owner-a',
    parent_id: 'root-a',
    kind: 'file',
    state: 'active',
    name: '照片.png',
    name_key: '照片.png',
    object_key: 'objects/photo',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    ...overrides,
  };
}

function access(overrides: Record<string, unknown> = {}) {
  return {
    resource_id: 'resource-a',
    filename: '照片.png',
    declared_mime: 'image/png',
    detected_mime: 'image/png',
    mime_type: 'image/png',
    size_bytes: 128,
    etag: 'etag-a',
    disposition: 'inline' as const,
    previewable: true,
    url: 'https://objects.example/photo.png?signature=test',
    expires_at: '2026-08-30T12:05:00Z',
    ...overrides,
  };
}

describe('预览抽屉', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('按安全 MIME 渲染图片预览并支持关闭', async () => {
    mockedUsePreviewResource.mockReturnValue({
      access: access(),
      error: null,
      isError: false,
      isLoading: false,
      text: null,
    });
    const onClose = vi.fn();

    render(<PreviewDrawer onClose={onClose} open resource={resource()} />);

    expect(await screen.findByRole('img', { name: '照片.png' })).toHaveAttribute(
      'src',
      expect.stringContaining('photo.png'),
    );
    fireEvent.click(screen.getByRole('button', { name: '关闭预览' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('渲染 Markdown 时不执行原始 HTML', async () => {
    mockedUsePreviewResource.mockReturnValue({
      access: access({
        filename: '说明.md',
        detected_mime: 'text/markdown',
        mime_type: 'text/markdown',
      }),
      error: null,
      isError: false,
      isLoading: false,
      text: '# 标题\n<script>alert(1)</script>',
    });

    const { container } = render(
      <PreviewDrawer onClose={vi.fn()} open resource={resource({ name: '说明.md' })} />,
    );

    expect(await screen.findByText(/标题/)).toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });

  it('按安全 MIME 渲染 PDF 和纯文本', async () => {
    mockedUsePreviewResource.mockReturnValue({
      access: access({
        filename: '手册.pdf',
        detected_mime: 'application/pdf',
        mime_type: 'application/pdf',
      }),
      error: null,
      isError: false,
      isLoading: false,
      text: null,
    });
    const { rerender } = render(
      <PreviewDrawer
        onClose={vi.fn()}
        open
        resource={resource({ name: '手册.pdf' })}
      />,
    );

    expect(await screen.findByTitle('手册.pdf')).toHaveAttribute(
      'src',
      expect.stringContaining('objects.example'),
    );

    mockedUsePreviewResource.mockReturnValue({
      access: access({
        filename: '说明.txt',
        detected_mime: 'text/plain',
        mime_type: 'text/plain',
      }),
      error: null,
      isError: false,
      isLoading: false,
      text: '第一行',
    });
    rerender(
      <PreviewDrawer
        onClose={vi.fn()}
        open
        resource={resource({ name: '说明.txt' })}
      />,
    );
    expect(await screen.findByText('第一行')).toBeInTheDocument();
  });

  it('关闭后恢复打开预览前的焦点', async () => {
    mockedUsePreviewResource.mockReturnValue({
      access: access(),
      error: null,
      isError: false,
      isLoading: false,
      text: null,
    });

    function PreviewHost(): JSX.Element {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            打开预览
          </button>
          <PreviewDrawer
            onClose={() => setOpen(false)}
            open={open}
            resource={resource()}
          />
        </>
      );
    }

    render(<PreviewHost />);
    const trigger = screen.getByRole('button', { name: '打开预览' });
    await userEvent.click(trigger);
    await userEvent.click(await screen.findByRole('button', { name: '关闭预览' }));
    expect(trigger).toHaveFocus();
  });

  it('对不支持或不安全的类型提供下载回退', async () => {
    mockedUsePreviewResource.mockReturnValue({
      access: access({
        filename: '页面.html',
        detected_mime: 'text/html',
        mime_type: 'text/html',
        disposition: 'attachment',
        previewable: false,
      }),
      error: null,
      isError: false,
      isLoading: false,
      text: null,
    });

    render(
      <PreviewDrawer
        onClose={vi.fn()}
        open
        resource={resource({ name: '页面.html' })}
      />,
    );

    const download = await screen.findByRole('link', { name: '下载文件' });
    expect(download).toHaveAttribute(
      'href',
      expect.stringContaining('objects.example'),
    );
    expect(download).toHaveAttribute('download', '页面.html');
  });
});
