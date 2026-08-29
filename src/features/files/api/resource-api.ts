import type {
  ResourceKind,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export type ResourceSortBy = 'name' | 'updated_at';
export type ResourceSortDirection = 'asc' | 'desc';

export interface ListFolderChildrenParams {
  parentId: string;
  kind?: ResourceKind;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: ResourceSortBy;
  sortDirection?: ResourceSortDirection;
  cursor?: string;
  limit?: number;
}

function createChildrenPath({
  parentId,
  kind,
  updatedFrom,
  updatedTo,
  sortBy = 'name',
  sortDirection = 'asc',
  cursor,
  limit = 50,
}: ListFolderChildrenParams): string {
  const query = new URLSearchParams();
  if (kind) query.set('kind', kind);
  if (updatedFrom) query.set('updated_from', updatedFrom);
  if (updatedTo) query.set('updated_to', updatedTo);
  query.set('sort_by', sortBy);
  query.set('sort_direction', sortDirection);
  if (cursor) query.set('cursor', cursor);
  query.set('limit', String(limit));

  // URLSearchParams 使用加号表示空格，统一改成 RFC 3986 的百分号编码，便于日志和缓存键保持稳定。
  const queryString = query.toString().replace(/\+/g, '%20');
  return `/api/v1/resources/${encodeURIComponent(parentId)}/children?${queryString}`;
}

export async function listFolderChildren(
  params: ListFolderChildrenParams,
): Promise<ResourceListResponse> {
  return apiClient.request<ResourceListResponse>(createChildrenPath(params), {
    method: 'GET',
  });
}

export async function getResourceDetail(resourceId: string): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(
    `/api/v1/resources/${encodeURIComponent(resourceId)}`,
    { method: 'GET' },
  );
}

export const resourceApi = {
  getResourceDetail,
  listFolderChildren,
};

export const listChildren = listFolderChildren;
export const getResource = getResourceDetail;
