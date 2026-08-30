import type {
  DocumentContentRequest,
  DocumentContentResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';
import type { DocumentContent } from '../models/document-content';

export interface DocumentRequestOptions {
  idempotencyKey?: string;
  signal?: AbortSignal;
}

function documentPath(resourceId: string): string {
  return `/api/v1/documents/${encodeURIComponent(resourceId)}`;
}

export function getDocumentContent(
  resourceId: string,
  options: Pick<DocumentRequestOptions, 'signal'> = {},
): Promise<DocumentContentResponse> {
  return apiClient.request<DocumentContentResponse>(documentPath(resourceId), {
    method: 'GET',
    signal: options.signal,
  });
}

export function saveDocumentContent(
  resourceId: string,
  payload: {
    content: DocumentContent;
    revision: number;
  },
  options: DocumentRequestOptions = {},
): Promise<DocumentContentResponse> {
  const headers = new Headers();
  headers.set('If-Match', `"${payload.revision}"`);
  if (options.idempotencyKey) {
    headers.set('Idempotency-Key', options.idempotencyKey);
  }
  const requestPayload: DocumentContentRequest = {
    content: payload.content,
    revision: payload.revision,
  };
  return apiClient.request<DocumentContentResponse>(documentPath(resourceId), {
    body: requestPayload,
    headers,
    method: 'PUT',
    signal: options.signal,
  });
}

export const documentApi = {
  get: getDocumentContent,
  save: saveDocumentContent,
};
