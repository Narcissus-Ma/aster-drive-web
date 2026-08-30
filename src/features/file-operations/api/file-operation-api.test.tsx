import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import {
  listTrashResources,
  moveResource,
  purgeResource,
  renameResource,
  restoreResource,
  trashResource,
} from './file-operation-api';

function responseBody() {
  return {
    id: 'resource-a',
    name: '项目',
    version: 2,
  };
}

describe('文件操作 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    apiClient.clearAccessToken();
  });

  it('向资源操作接口传递当前版本', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify(responseBody()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await renameResource('resource-a', { name: '新名称', version: 1 });
    await moveResource('resource-a', { target_parent_id: 'folder-b', version: 2 });
    await trashResource('resource-a', { version: 3 });
    await restoreResource('resource-a', { version: 4 });
    await purgeResource('resource-a', { version: 5 });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/resources/resource-a',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: '新名称', version: 1 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/resources/resource-a/move',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ target_parent_id: 'folder-b', version: 2 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/resources/resource-a',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ version: 3 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/resources/resource-a/restore',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ version: 4 }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/v1/resources/resource-a/purge',
      expect.objectContaining({
        method: 'DELETE',
        body: JSON.stringify({ version: 5 }),
      }),
    );
  });

  it('读取带分页参数的回收站资源', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [], next_cursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await listTrashResources({ cursor: '下一页', limit: 20 });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/resources/trash?cursor=%E4%B8%8B%E4%B8%80%E9%A1%B5&limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
  });
});
