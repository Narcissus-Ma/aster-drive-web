import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DocumentContent } from '../models/document-content';
import { getDocumentContent, saveDocumentContent } from './document-api';

const content: DocumentContent = { type: 'doc', content: [{ type: 'paragraph' }] };

function response() {
  return {
    resource_id: 'resource-a',
    content,
    revision: 2,
    content_hash: 'hash-b',
    effective_role: 'editor',
    capabilities: { can_edit_content: true, can_download: true },
  };
}

describe('原生文档 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('读取文档内容时编码资源 ID', async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(JSON.stringify(response()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await getDocumentContent('resource id');

    expect(result.revision).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/documents/resource%20id',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('保存文档时携带 revision、幂等键和 If-Match', async () => {
    type FetchMock = (
      input: RequestInfo | URL,
      init?: RequestInit,
    ) => Promise<Response>;
    const fetchMock = vi.fn<FetchMock>(async (...args) => {
      void args;
      return new Response(JSON.stringify(response()), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ETag: '"2"' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await saveDocumentContent(
      'resource-a',
      { content, revision: 1 },
      { idempotencyKey: 'save-a' },
    );

    const [, init] = fetchMock.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(init?.method).toBe('PUT');
    expect(headers.get('If-Match')).toBe('"1"');
    expect(headers.get('Idempotency-Key')).toBe('save-a');
    expect(JSON.parse(String(init?.body))).toEqual({ content, revision: 1 });
  });
});
