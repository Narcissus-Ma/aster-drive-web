import type {
  ResourceListResponse,
  ResourceMoveRequest,
  ResourcePatchRequest,
  ResourceResponse,
  ResourceVersionRequest,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

function resourcePath(resourceId: string, suffix = ''): string {
  return `/api/v1/resources/${encodeURIComponent(resourceId)}${suffix}`;
}

export async function renameResource(
  resourceId: string,
  payload: ResourcePatchRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(resourcePath(resourceId), {
    method: 'PATCH',
    body: payload,
  });
}

export async function moveResource(
  resourceId: string,
  payload: ResourceMoveRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(resourcePath(resourceId, '/move'), {
    method: 'POST',
    body: payload,
  });
}

export async function trashResource(
  resourceId: string,
  payload: ResourceVersionRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(resourcePath(resourceId), {
    method: 'DELETE',
    body: payload,
  });
}

export async function restoreResource(
  resourceId: string,
  payload: ResourceVersionRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(resourcePath(resourceId, '/restore'), {
    method: 'POST',
    body: payload,
  });
}

export async function purgeResource(
  resourceId: string,
  payload: ResourceVersionRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(resourcePath(resourceId, '/purge'), {
    method: 'DELETE',
    body: payload,
  });
}

export interface ListTrashResourcesParams {
  cursor?: string;
  limit?: number;
}

export async function listTrashResources(
  params: ListTrashResourcesParams = {},
): Promise<ResourceListResponse> {
  const query = new URLSearchParams();
  if (params.cursor) query.set('cursor', params.cursor);
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const queryString = query.toString().replace(/\+/g, '%20');
  const suffix = queryString.length > 0 ? `?${queryString}` : '';
  return apiClient.request<ResourceListResponse>(`/api/v1/resources/trash${suffix}`, {
    method: 'GET',
  });
}

export const fileOperationApi = {
  listTrashResources,
  moveResource,
  purgeResource,
  renameResource,
  restoreResource,
  trashResource,
};
