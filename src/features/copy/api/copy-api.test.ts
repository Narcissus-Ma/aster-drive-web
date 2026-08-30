import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import { copyResource, getCopyOperation } from './copy-api';

describe('复制 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    apiClient.clearAccessToken();
  });

  it('提交复制请求时传递目标目录、版本和显式名称', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            operation_id: 'operation-a',
            status: 'pending',
          }),
          { status: 202, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await copyResource('resource-a', {
      name: '报告副本.pdf',
      target_parent_id: 'folder-b',
      version: 3,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/resources/resource-a/copy',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: '报告副本.pdf',
          target_parent_id: 'folder-b',
          version: 3,
        }),
      }),
    );
  });

  it('按 operation id 查询后台复制进度', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            operation_id: 'operation-a',
            progress: 42,
            status: 'pending',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    await getCopyOperation('operation-a');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/copies/operation-a',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
