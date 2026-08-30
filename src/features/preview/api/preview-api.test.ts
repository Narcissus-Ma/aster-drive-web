import { afterEach, describe, expect, it, vi } from 'vitest';

import { getDownloadAccess, getPreviewAccess } from './preview-api';

function accessResponse() {
  return {
    resource_id: 'resource-a',
    filename: '报告.pdf',
    declared_mime: 'application/pdf',
    detected_mime: 'application/pdf',
    mime_type: 'application/pdf',
    size_bytes: 1024,
    etag: 'etag-a',
    disposition: 'inline' as const,
    previewable: true,
    url: 'https://objects.example/report.pdf?signature=test',
    expires_at: '2026-08-30T12:05:00Z',
  };
}

describe('内容预览 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('请求预览描述并编码资源 ID', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(accessResponse()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getPreviewAccess('resource id');

    expect(result.filename).toBe('报告.pdf');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/content/resource%20id/preview',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('请求下载描述并保留服务端返回的附件策略', async () => {
    const response = { ...accessResponse(), disposition: 'attachment' as const };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDownloadAccess('resource-a');

    expect(result.disposition).toBe('attachment');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/content/resource-a/download',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
