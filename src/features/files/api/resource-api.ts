import type {
  ResourceCreateRequest,
  ResourceKind,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { ApiClientError, apiClient } from '../../../shared/api/api-client';

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

export interface ResolveRootResourceOptions {
  signal?: AbortSignal;
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

export async function createFolder(
  payload: ResourceCreateRequest,
): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>('/api/v1/resources/folders', {
    method: 'POST',
    body: payload,
  });
}

export async function getResourceDetail(resourceId: string): Promise<ResourceResponse> {
  return apiClient.request<ResourceResponse>(
    `/api/v1/resources/${encodeURIComponent(resourceId)}`,
    { method: 'GET' },
  );
}

export async function resolveRootResource(
  options: ResolveRootResourceOptions = {},
): Promise<ResourceResponse> {
  const query = new URLSearchParams({
    q: '我的文件',
    kind: 'root',
    limit: '10',
  });
  const response = await apiClient.request<ResourceListResponse>(
    `/api/v1/search?${query.toString().replace(/\+/g, '%20')}`,
    { method: 'GET', signal: options.signal },
  );
  const root = response.items.find((item) => item.kind === 'root');
  if (root) return root;
  throw new ApiClientError('未找到当前用户的根目录', {
    status: 404,
    code: 'root_resource_not_found',
  });
}

export const resourceApi = {
  createFolder,
  getResourceDetail,
  listFolderChildren,
  resolveRootResource,
};

export const listChildren = listFolderChildren;
export const getResource = getResourceDetail;
