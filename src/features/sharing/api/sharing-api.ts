import type {
  GrantCreateRequest,
  GrantListResponse,
  GrantResponse,
  MessageResponse,
  PublicShareResponse,
  ShareLinkListResponse,
  ShareLinkResponse,
  SharedRootListResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export interface ListSharedWithMeParams {
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface SharingRequestOptions {
  signal?: AbortSignal;
}

function createQueryString(
  params: Record<string, string | number | undefined>,
): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  return query.toString().replace(/\+/g, '%20');
}

function resourcePath(resourceId: string, suffix: string): string {
  return `/api/v1/resources/${encodeURIComponent(resourceId)}${suffix}`;
}

export function listGrants(
  resourceId: string,
  options: SharingRequestOptions = {},
): Promise<GrantListResponse> {
  return apiClient.request<GrantListResponse>(resourcePath(resourceId, '/grants'), {
    method: 'GET',
    signal: options.signal,
  });
}

export function createGrant(
  resourceId: string,
  body: GrantCreateRequest,
  options: SharingRequestOptions = {},
): Promise<GrantResponse> {
  return apiClient.request<GrantResponse>(resourcePath(resourceId, '/grants'), {
    method: 'POST',
    body,
    signal: options.signal,
  });
}

export function revokeGrant(
  resourceId: string,
  granteeUserId: string,
  options: SharingRequestOptions = {},
): Promise<MessageResponse> {
  return apiClient.request<MessageResponse>(
    resourcePath(resourceId, `/grants/${encodeURIComponent(granteeUserId)}`),
    { method: 'DELETE', signal: options.signal },
  );
}

export function listSharedWithMe({
  cursor,
  limit,
  signal,
}: ListSharedWithMeParams = {}): Promise<SharedRootListResponse> {
  const query = createQueryString({ cursor, limit });
  return apiClient.request<SharedRootListResponse>(
    `/api/v1/views/shared${query ? `?${query}` : ''}`,
    { method: 'GET', signal },
  );
}

export function listPublicLinks(
  resourceId: string,
  options: SharingRequestOptions = {},
): Promise<ShareLinkListResponse> {
  return apiClient.request<ShareLinkListResponse>(
    resourcePath(resourceId, '/share-links'),
    { method: 'GET', signal: options.signal },
  );
}

export function createPublicLink(
  resourceId: string,
  options: SharingRequestOptions = {},
): Promise<ShareLinkResponse> {
  return apiClient.request<ShareLinkResponse>(
    resourcePath(resourceId, '/share-links'),
    { method: 'POST', signal: options.signal },
  );
}

export function revokePublicLink(
  resourceId: string,
  linkId: string,
  options: SharingRequestOptions = {},
): Promise<MessageResponse> {
  return apiClient.request<MessageResponse>(
    resourcePath(resourceId, `/share-links/${encodeURIComponent(linkId)}`),
    { method: 'DELETE', signal: options.signal },
  );
}

export function getPublicShare(
  token: string,
  options: SharingRequestOptions = {},
): Promise<PublicShareResponse> {
  return apiClient.request<PublicShareResponse>(
    `/api/v1/public/share/${encodeURIComponent(token)}`,
    {
      auth: false,
      method: 'GET',
      retryUnauthorized: false,
      signal: options.signal,
    },
  );
}
