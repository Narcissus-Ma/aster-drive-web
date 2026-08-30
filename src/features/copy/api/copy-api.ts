import type {
  CopyOperationResponse,
  CopyRequest,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

function resourceCopyPath(resourceId: string): string {
  return `/api/v1/resources/${encodeURIComponent(resourceId)}/copy`;
}

export async function copyResource(
  resourceId: string,
  payload: CopyRequest,
): Promise<CopyOperationResponse> {
  return apiClient.request<CopyOperationResponse>(resourceCopyPath(resourceId), {
    method: 'POST',
    body: payload,
  });
}

export async function getCopyOperation(
  operationId: string,
): Promise<CopyOperationResponse> {
  return apiClient.request<CopyOperationResponse>(
    `/api/v1/copies/${encodeURIComponent(operationId)}`,
    { method: 'GET' },
  );
}

export const copyApi = {
  copyResource,
  getCopyOperation,
};
