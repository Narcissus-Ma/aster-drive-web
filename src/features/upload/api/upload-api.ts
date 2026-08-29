import type {
  UploadSessionCompleteRequest,
  UploadSessionCreateRequest,
  UploadSessionResponse,
} from '../../../shared/api/generated/openapi';
import { apiClient } from '../../../shared/api/api-client';

export interface UploadProgress {
  loaded: number;
  total: number;
}

export interface UploadTransportOptions {
  signal?: AbortSignal;
  onProgress?: (progress: UploadProgress) => void;
}

export interface UploadTransportResult {
  etag: string | null;
}

export class UploadTransportError extends Error {
  readonly status: number;

  constructor(message: string, status = 0) {
    super(message);
    this.name = 'UploadTransportError';
    this.status = status;
  }
}

export async function createUploadSession(
  payload: UploadSessionCreateRequest,
): Promise<UploadSessionResponse> {
  return apiClient.request<UploadSessionResponse>('/api/v1/uploads/sessions', {
    body: payload,
    method: 'POST',
  });
}

export async function getUploadSession(
  sessionId: string,
): Promise<UploadSessionResponse> {
  return apiClient.request<UploadSessionResponse>(
    `/api/v1/uploads/sessions/${encodeURIComponent(sessionId)}`,
    { method: 'GET' },
  );
}

export async function renewUploadSession(
  sessionId: string,
): Promise<UploadSessionResponse> {
  return apiClient.request<UploadSessionResponse>(
    `/api/v1/uploads/sessions/${encodeURIComponent(sessionId)}/renew`,
    { method: 'POST' },
  );
}

export async function completeUploadSession(
  sessionId: string,
  payload: UploadSessionCompleteRequest,
): Promise<UploadSessionResponse> {
  return apiClient.request<UploadSessionResponse>(
    `/api/v1/uploads/sessions/${encodeURIComponent(sessionId)}/complete`,
    { body: payload, method: 'POST' },
  );
}

export async function abortUploadSession(
  sessionId: string,
): Promise<UploadSessionResponse> {
  return apiClient.request<UploadSessionResponse>(
    `/api/v1/uploads/sessions/${encodeURIComponent(sessionId)}/abort`,
    { method: 'POST' },
  );
}

export function uploadFileToPresignedUrl(
  url: string,
  file: Blob,
  options: UploadTransportOptions = {},
): Promise<UploadTransportResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let settled = false;

    const createAbortError = (): Error => {
      if (typeof DOMException !== 'undefined') {
        return new DOMException('上传已取消', 'AbortError');
      }
      const error = new Error('上传已取消');
      error.name = 'AbortError';
      return error;
    };

    const cleanup = () => {
      options.signal?.removeEventListener('abort', handleSignalAbort);
    };

    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      cleanup();
      callback();
    };

    const handleSignalAbort = () => {
      xhr.abort();
    };

    xhr.open('PUT', url, true);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const rawEtag = xhr.getResponseHeader('ETag');
        finish(() => resolve({ etag: rawEtag?.replace(/^"|"$/g, '') ?? null }));
        return;
      }
      finish(() => reject(new UploadTransportError('上传文件失败', xhr.status)));
    };
    xhr.onerror = () => {
      finish(() => reject(new UploadTransportError('上传网络失败', xhr.status)));
    };
    xhr.ontimeout = () => {
      finish(() => reject(new UploadTransportError('上传请求超时', xhr.status)));
    };
    xhr.onabort = () => {
      finish(() => reject(createAbortError()));
    };
    xhr.upload.onprogress = (event) => {
      options.onProgress?.({
        loaded: event.loaded,
        total: event.total || file.size,
      });
    };
    options.signal?.addEventListener('abort', handleSignalAbort, { once: true });

    if (options.signal?.aborted) {
      handleSignalAbort();
      return;
    }

    xhr.send(file);
  });
}

export const uploadApi = {
  abortSession: abortUploadSession,
  completeSession: completeUploadSession,
  createSession: createUploadSession,
  getSession: getUploadSession,
  renewSession: renewUploadSession,
};
