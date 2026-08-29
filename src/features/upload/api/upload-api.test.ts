import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  abortUploadSession,
  completeUploadSession,
  createUploadSession,
  getUploadSession,
  renewUploadSession,
  uploadFileToPresignedUrl,
} from './upload-api';

class MockXmlHttpRequest {
  static latest: MockXmlHttpRequest | undefined;

  readonly upload = {
    onprogress: null as ((event: { loaded: number; total: number }) => void) | null,
  };

  status = 0;
  aborted = false;
  requestBody: Blob | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  ontimeout: (() => void) | null = null;
  onabort: (() => void) | null = null;
  private responseHeaders = new Map<string, string>();

  constructor() {
    MockXmlHttpRequest.latest = this;
  }

  open(): void {}

  send(body: Blob): void {
    this.requestBody = body;
  }

  abort(): void {
    this.aborted = true;
    this.onabort?.();
  }

  getResponseHeader(name: string): string | null {
    return this.responseHeaders.get(name) ?? null;
  }

  setResponseHeader(name: string, value: string): void {
    this.responseHeaders.set(name, value);
  }
}

describe('上传 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    MockXmlHttpRequest.latest = undefined;
  });

  it('通过统一 API 客户端调用上传会话端点', async () => {
    const response = {
      id: 'session-1',
      status: 'pending',
    };
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(response), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await createUploadSession({
      client_upload_id: 'client-1',
      declared_mime: 'text/plain',
      name: '报告.txt',
      parent_id: 'folder-1',
      size_bytes: 5,
    });
    await getUploadSession('session/1');
    await renewUploadSession('session-1');
    await completeUploadSession('session-1', { name: '报告 2.txt' });
    await abortUploadSession('session-1');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/uploads/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/uploads/sessions/session%2F1',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/uploads/sessions/session-1/complete',
      expect.objectContaining({
        body: JSON.stringify({ name: '报告 2.txt' }),
        method: 'POST',
      }),
    );
  });

  it('使用 XHR 上报进度并读取 ETag', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXmlHttpRequest);
    const onProgress = vi.fn();
    const file = new File(['hello'], '报告.txt', { type: 'text/plain' });
    const promise = uploadFileToPresignedUrl('https://storage/upload', file, {
      onProgress,
    });
    const xhr = MockXmlHttpRequest.latest;
    expect(xhr?.requestBody).toBe(file);

    xhr?.upload.onprogress?.({ loaded: 2, total: 5 });
    xhr?.setResponseHeader('ETag', '"etag-1"');
    if (xhr) {
      xhr.status = 200;
      xhr.onload?.();
    }

    await expect(promise).resolves.toEqual({ etag: 'etag-1' });
    expect(onProgress).toHaveBeenCalledWith({ loaded: 2, total: 5 });
  });

  it('AbortSignal 取消 XHR 并返回 AbortError', async () => {
    vi.stubGlobal('XMLHttpRequest', MockXmlHttpRequest);
    const controller = new AbortController();
    const promise = uploadFileToPresignedUrl(
      'https://storage/upload',
      new File(['hello'], '取消.txt'),
      { signal: controller.signal },
    );

    controller.abort();

    await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    expect(MockXmlHttpRequest.latest?.aborted).toBe(true);
  });
});
