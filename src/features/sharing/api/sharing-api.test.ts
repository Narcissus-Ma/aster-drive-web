import { afterEach, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../../shared/api/api-client';
import {
  createGrant,
  createPublicLink,
  getPublicShare,
  listGrants,
  listPublicLinks,
  listSharedWithMe,
  revokeGrant,
  revokePublicLink,
} from './sharing-api';

function jsonResponse(payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('共享 API', () => {
  afterEach(() => {
    apiClient.clearAccessToken();
    vi.unstubAllGlobals();
  });

  it('请求成员列表、邀请成员、更新权限和撤销成员', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).includes('/grants/'))
        return jsonResponse({ status: 'revoked' });
      if (init?.method === 'POST') {
        return jsonResponse({
          id: 'grant-a',
          resource_id: 'resource-a',
          grantee_user_id: 'user-b',
          granted_by: 'owner-a',
          role: 'editor',
          created_at: '2026-08-30T00:00:00Z',
        });
      }
      return jsonResponse({ items: [] });
    });
    vi.stubGlobal('fetch', fetchMock);

    await listGrants('resource-a');
    await createGrant('resource-a', { grantee_user_id: 'user-b', role: 'editor' });
    await revokeGrant('resource-a', 'user-b');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/resources/resource-a/grants',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/resources/resource-a/grants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ grantee_user_id: 'user-b', role: 'editor' }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/resources/resource-a/grants/user-b',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('请求共享给我的游标列表和公开链接管理接口', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [], next_cursor: null }));
    vi.stubGlobal('fetch', fetchMock);

    await listSharedWithMe({ cursor: 'next cursor', limit: 20 });
    await listPublicLinks('resource-a');
    await createPublicLink('resource-a');
    await revokePublicLink('resource-a', 'link-a');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/views/shared?cursor=next%20cursor&limit=20',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/resources/resource-a/share-links',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/resources/resource-a/share-links',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/resources/resource-a/share-links/link-a',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('匿名公开访问不携带登录态 bearer token', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        resource_id: 'resource-a',
        kind: 'document',
        read_only: true,
        resource: { id: 'resource-a', kind: 'document', name: '公开文档' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);
    apiClient.setAccessToken('private-token');

    await getPublicShare('public token');

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/public/share/public%20token',
      expect.objectContaining({
        method: 'GET',
        headers: expect.not.objectContaining({ Authorization: expect.anything() }),
      }),
    );
  });
});
