export type UploadTaskStatus =
  | 'waiting'
  | 'uploading'
  | 'finalizing'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'name-conflict';

export interface UploadTask {
  id: string;
  clientUploadId: string;
  parentId: string;
  name: string;
  file: File;
  sessionId?: string;
  uploadUrl?: string;
  uploadUrlExpiresAt?: string;
  expectedSize: number;
  declaredMime?: string;
  detectedMime?: string;
  etag?: string;
  resourceId?: string;
  progress: number;
  status: UploadTaskStatus;
  errorCode?: string;
  errorMessage?: string;
}

function createId(prefix: string): string {
  const randomUuid = globalThis.crypto?.randomUUID;
  if (typeof randomUuid === 'function') {
    return randomUuid.call(globalThis.crypto);
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createUploadTask(file: File, parentId: string): UploadTask {
  return {
    id: createId('upload'),
    clientUploadId: createId('client-upload'),
    parentId,
    name: file.name,
    file,
    expectedSize: file.size,
    declaredMime: file.type || undefined,
    progress: 0,
    status: 'waiting',
  };
}
