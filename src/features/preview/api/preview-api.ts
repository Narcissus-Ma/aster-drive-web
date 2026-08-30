import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export interface PreviewRequestOptions {
  signal?: AbortSignal;
}

function contentPath(resourceId: string, action: 'preview' | 'download'): string {
  return `/api/v1/content/${encodeURIComponent(resourceId)}/${action}`;
}

export function getPreviewAccess(
  resourceId: string,
  options: PreviewRequestOptions = {},
): Promise<ContentAccessResponse> {
  return apiClient.request<ContentAccessResponse>(contentPath(resourceId, 'preview'), {
    method: 'GET',
    signal: options.signal,
  });
}

export function getDownloadAccess(
  resourceId: string,
  options: PreviewRequestOptions = {},
): Promise<ContentAccessResponse> {
  return apiClient.request<ContentAccessResponse>(contentPath(resourceId, 'download'), {
    method: 'GET',
    signal: options.signal,
  });
}

export const previewApi = {
  getDownloadAccess,
  getPreviewAccess,
};
