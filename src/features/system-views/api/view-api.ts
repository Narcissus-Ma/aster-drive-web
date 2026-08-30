import type {
  MessageResponse,
  ResourceKind,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export type SystemViewKind = 'favorites' | 'recent';

export interface ListSystemViewParams {
  view: SystemViewKind;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

export interface SearchResourcesParams {
  query: string;
  kind?: ResourceKind;
  updatedFrom?: string;
  updatedTo?: string;
  cursor?: string;
  limit?: number;
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

export async function listSystemView({
  view,
  cursor,
  limit,
  signal,
}: ListSystemViewParams): Promise<ResourceListResponse> {
  const queryString = createQueryString({ cursor, limit });
  const path = `/api/v1/views/${view}${queryString ? `?${queryString}` : ''}`;
  return apiClient.request<ResourceListResponse>(path, { method: 'GET', signal });
}

export async function addFavorite(resourceId: string): Promise<MessageResponse> {
  return apiClient.request<MessageResponse>(
    `/api/v1/views/favorites/${encodeURIComponent(resourceId)}`,
    { method: 'PUT' },
  );
}

export async function removeFavorite(resourceId: string): Promise<MessageResponse> {
  return apiClient.request<MessageResponse>(
    `/api/v1/views/favorites/${encodeURIComponent(resourceId)}`,
    { method: 'DELETE' },
  );
}

export async function recordRecentAccess(
  resourceId: string,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(
    `/api/v1/views/recent/${encodeURIComponent(resourceId)}`,
    { method: 'POST' },
  );
}

export async function searchResources({
  query,
  kind,
  updatedFrom,
  updatedTo,
  cursor,
  limit,
  signal,
}: SearchResourcesParams): Promise<ResourceListResponse> {
  const queryString = createQueryString({
    q: query.trim(),
    kind,
    updated_from: updatedFrom,
    updated_to: updatedTo,
    cursor,
    limit,
  });
  return apiClient.request<ResourceListResponse>(`/api/v1/search?${queryString}`, {
    method: 'GET',
    signal,
  });
}
