import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { createFolder, resolveRootResource } from './resource-api';

function rootResource(): ResourceResponse {
  return {
    id: 'root-real',
    owner_id: 'owner-a',
    created_by: 'owner-a',
    parent_id: null,
    kind: 'root',
    state: 'active',
    name: '我的文件',
    name_key: '我的文件',
    version: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-02T00:00:00Z',
    capabilities: { can_accept_children: true },
  };
}

describe('资源 API', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('通过根资源搜索解析当前用户的真实根目录', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ items: [rootResource()], next_cursor: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await resolveRootResource();

    expect(result.id).toBe('root-real');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        '/api/v1/search?q=%E6%88%91%E7%9A%84%E6%96%87%E4%BB%B6&kind=root',
      ),
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('搜索结果没有根资源时返回可识别的错误码', async () => {
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

    await expect(resolveRootResource()).rejects.toMatchObject({
      code: 'root_resource_not_found',
      status: 404,
    });
  });

  it('使用当前目录创建文件夹', async () => {
    const created = rootResource();
    created.id = 'folder-new';
    created.kind = 'folder';
    created.parent_id = 'root-real';
    created.name = '新资料';
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe('/api/v1/resources/folders');
      expect(init?.method).toBe('POST');
      expect(JSON.parse(String(init?.body))).toEqual({
        name: '新资料',
        parent_id: 'root-real',
      });
      return new Response(JSON.stringify(created), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      createFolder({ name: '新资料', parent_id: 'root-real' }),
    ).resolves.toMatchObject({ id: 'folder-new', name: '新资料' });
  });
});
