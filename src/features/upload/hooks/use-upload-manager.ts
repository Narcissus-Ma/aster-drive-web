import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import { ApiClientError } from '../../../shared/api/api-client';
import type {
  UploadSessionCompleteRequest,
  UploadSessionCreateRequest,
  UploadSessionResponse,
} from '../../../shared/api/generated/openapi';
import { resourceQueryKeys } from '../../files/hooks/use-folder-children';
import {
  abortUploadSession,
  completeUploadSession,
  createUploadSession,
  getUploadSession,
  renewUploadSession,
  uploadFileToPresignedUrl,
  UploadTransportError,
  type UploadProgress,
  type UploadTransportOptions,
  type UploadTransportResult,
} from '../api/upload-api';
import {
  createUploadTask,
  type UploadTask,
  type UploadTaskStatus,
} from '../models/upload-task';
import { useUploadTaskStore } from '../store/upload-task-store';

export type UploadTransport = (
  url: string,
  file: Blob,
  options: UploadTransportOptions,
) => Promise<UploadTransportResult>;

export interface UploadApi {
  createSession: (
    payload: UploadSessionCreateRequest,
  ) => Promise<UploadSessionResponse>;
  getSession: (sessionId: string) => Promise<UploadSessionResponse>;
  renewSession: (sessionId: string) => Promise<UploadSessionResponse>;
  completeSession: (
    sessionId: string,
    payload: UploadSessionCompleteRequest,
  ) => Promise<UploadSessionResponse>;
  abortSession: (sessionId: string) => Promise<UploadSessionResponse>;
}

export interface UploadManagerDependencies {
  api?: UploadApi;
  transport?: UploadTransport;
  queryClient?: QueryClient;
  store?: typeof useUploadTaskStore;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
  maxFileSizeBytes?: number;
}

export interface UploadManager {
  enqueue: (files: File[] | FileList, parentId: string) => Promise<void>;
  startUpload: (taskId: string) => Promise<void>;
  complete: (taskOrId: UploadTask | string, name?: string) => Promise<void>;
  retryName: (taskOrId: UploadTask | string, name: string) => Promise<void>;
  retry: (taskId: string) => Promise<void>;
  cancel: (taskId: string) => Promise<void>;
  clearCompleted: () => void;
}

export interface UseUploadManagerOptions extends UploadManagerDependencies {
  parentId: string;
}

const defaultPollIntervalMs = 500;
const defaultMaxPollAttempts = 20;

const terminalTaskStatuses = new Set<UploadTaskStatus>(['completed', 'canceled']);

const uploadApiAdapter: UploadApi = {
  abortSession: abortUploadSession,
  completeSession: completeUploadSession,
  createSession: createUploadSession,
  getSession: getUploadSession,
  renewSession: renewUploadSession,
};

const defaultTransport: UploadTransport = uploadFileToPresignedUrl;

class UploadManagerError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'UploadManagerError';
    this.code = code;
  }
}

const errorMessages: Record<string, string> = {
  name_conflict: '文件名已存在',
  upload_expired: '上传会话已过期，请重新上传',
  upload_finalize_timeout: '上传最终化超时，请稍后重试',
  upload_object_not_ready: '文件仍在处理中，请稍后重试',
  upload_transport_error: '文件上传失败，请检查网络后重试',
  upload_url_expired: '上传地址已过期，正在准备重试',
};

function normalizeFiles(files: File[] | FileList): File[] {
  return Array.from(files);
}

function getTask(
  store: typeof useUploadTaskStore,
  taskId: string,
): UploadTask | undefined {
  return store.getState().tasks.find((task) => task.id === taskId);
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

function isRenewableTransportError(error: unknown): boolean {
  if (error instanceof UploadTransportError) {
    return error.status === 401 || error.status === 403 || error.status === 410;
  }
  return error instanceof ApiClientError && [401, 403, 410].includes(error.status);
}

function isNameConflictError(error: unknown): boolean {
  return error instanceof ApiClientError && error.code === 'name_conflict';
}

function errorDetails(error: unknown): { code: string; message: string } {
  if (error instanceof ApiClientError) {
    const code = error.code ?? `upload_http_${error.status}`;
    return {
      code,
      message: errorMessages[code] ?? error.message,
    };
  }
  if (error instanceof UploadTransportError) {
    const code =
      error.status === 403 || error.status === 410
        ? 'upload_url_expired'
        : 'upload_transport_error';
    return {
      code,
      message: errorMessages[code] ?? error.message,
    };
  }
  if (error instanceof UploadManagerError) {
    return {
      code: error.code,
      message: errorMessages[error.code] ?? error.message,
    };
  }
  if (error instanceof Error) {
    return { code: 'upload_failed', message: error.message };
  }
  return { code: 'upload_failed', message: '上传失败，请稍后重试' };
}

function toProgressValue(progress: UploadProgress): number {
  if (progress.total <= 0) return 99;
  return Math.min(99, Math.max(0, Math.round((progress.loaded / progress.total) * 99)));
}

function updateFromSession(
  store: typeof useUploadTaskStore,
  taskId: string,
  session: UploadSessionResponse,
): void {
  store.getState().updateTask(taskId, {
    sessionId: session.id,
    uploadUrl: session.upload_url ?? undefined,
    uploadUrlExpiresAt: session.upload_url_expires_at,
    resourceId: session.resource_id ?? undefined,
    detectedMime: session.detected_mime ?? undefined,
  });
}

function validateFile(
  file: File,
  maxFileSizeBytes: number | undefined,
): string | undefined {
  if (file.name.trim().length === 0) return '文件名不能为空';
  if (maxFileSizeBytes !== undefined && file.size > maxFileSizeBytes) {
    return `文件大小不能超过 ${maxFileSizeBytes} 字节`;
  }
  return undefined;
}

export function createUploadManager({
  api = uploadApiAdapter,
  transport = defaultTransport,
  queryClient,
  store = useUploadTaskStore,
  pollIntervalMs = defaultPollIntervalMs,
  maxPollAttempts = defaultMaxPollAttempts,
  maxFileSizeBytes,
}: UploadManagerDependencies = {}): UploadManager {
  const controllers = new Map<string, AbortController>();
  const running = new Map<string, Promise<void>>();

  const invalidateParentQuery = async (parentId: string): Promise<void> => {
    if (!queryClient) return;
    await queryClient.invalidateQueries({
      queryKey: resourceQueryKeys.children({ parentId }),
    });
  };

  const markCompleted = async (
    taskId: string,
    session: UploadSessionResponse,
    preferredName?: string,
  ): Promise<void> => {
    const task = getTask(store, taskId);
    if (!task) return;
    store.getState().updateTask(taskId, {
      detectedMime: session.detected_mime ?? task.detectedMime,
      name: preferredName ?? session.name ?? task.name,
      progress: 100,
      resourceId: session.resource_id ?? task.resourceId,
      status: 'completed',
      errorCode: undefined,
      errorMessage: undefined,
    });
    await invalidateParentQuery(task.parentId);
  };

  const markSessionResult = async (
    taskId: string,
    session: UploadSessionResponse,
    preferredName?: string,
  ): Promise<void> => {
    updateFromSession(store, taskId, session);
    if (session.status === 'completed') {
      await markCompleted(taskId, session, preferredName);
      return;
    }
    if (session.status === 'aborted') {
      store.getState().updateTask(taskId, {
        status: 'canceled',
        errorCode: undefined,
        errorMessage: undefined,
      });
      return;
    }
    if (session.status === 'failed' || session.status === 'expired') {
      throw new UploadManagerError(
        `upload_${session.status}`,
        session.status === 'expired' ? '上传会话已过期' : '上传最终化失败',
      );
    }

    store.getState().updateTask(taskId, { status: 'finalizing' });
    let current = session;
    for (let attempt = 0; attempt < maxPollAttempts; attempt += 1) {
      if (pollIntervalMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
      } else {
        await Promise.resolve();
      }
      current = await api.getSession(current.id);
      updateFromSession(store, taskId, current);
      if (current.status === 'completed') {
        await markCompleted(taskId, current, preferredName);
        return;
      }
      if (current.status === 'aborted') {
        store.getState().updateTask(taskId, { status: 'canceled' });
        return;
      }
      if (current.status === 'failed' || current.status === 'expired') {
        throw new UploadManagerError(
          `upload_${current.status}`,
          current.status === 'expired' ? '上传会话已过期' : '上传最终化失败',
        );
      }
    }
    throw new UploadManagerError(
      'upload_finalize_timeout',
      '上传最终化超时，请稍后重试',
    );
  };

  const complete = async (
    taskOrId: UploadTask | string,
    name?: string,
  ): Promise<void> => {
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id;
    const task = getTask(store, taskId);
    if (!task?.sessionId) {
      throw new UploadManagerError('upload_session_missing', '上传会话不存在');
    }
    const payload: UploadSessionCompleteRequest = {
      detected_mime: null,
      etag: task.etag ?? null,
      name: name ?? null,
      size_bytes: task.expectedSize,
    };
    try {
      const response = await api.completeSession(task.sessionId, payload);
      await markSessionResult(taskId, response, name);
    } catch (error) {
      if (isNameConflictError(error)) {
        const details = errorDetails(error);
        store.getState().updateTask(taskId, {
          errorCode: 'name_conflict',
          errorMessage: details.message || '文件名已存在',
          status: 'name-conflict',
        });
        return;
      }
      throw error;
    }
  };

  const uploadBytes = async (
    task: UploadTask,
    session: UploadSessionResponse,
    controller: AbortController,
  ): Promise<UploadTransportResult> => {
    let currentSession = session;
    let uploadUrl = currentSession.upload_url ?? task.uploadUrl;
    if (!uploadUrl) {
      throw new UploadManagerError('upload_url_missing', '上传地址不可用');
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        return await transport(uploadUrl, task.file, {
          signal: controller.signal,
          onProgress: (progress) => {
            const currentTask = getTask(store, task.id);
            if (!currentTask || currentTask.status === 'canceled') return;
            store.getState().updateTask(task.id, {
              progress: toProgressValue(progress),
              status: 'uploading',
            });
          },
        });
      } catch (error) {
        if (isAbortError(error) || controller.signal.aborted) throw error;
        if (attempt === 0 && isRenewableTransportError(error) && currentSession.id) {
          currentSession = await api.renewSession(currentSession.id);
          updateFromSession(store, task.id, currentSession);
          uploadUrl = currentSession.upload_url ?? undefined;
          if (!uploadUrl)
            throw new UploadManagerError('upload_url_missing', '续签后上传地址不可用');
          continue;
        }
        throw error;
      }
    }
    throw new UploadManagerError('upload_failed', '上传失败');
  };

  const runUpload = async (taskId: string): Promise<void> => {
    const controller = new AbortController();
    controllers.set(taskId, controller);
    try {
      let task = getTask(store, taskId);
      if (!task || terminalTaskStatuses.has(task.status)) return;

      let session: UploadSessionResponse | undefined;
      if (task.sessionId && task.uploadUrl) {
        session = {
          id: task.sessionId,
          user_id: '',
          parent_id: task.parentId,
          resource_id: task.resourceId ?? null,
          client_upload_id: task.clientUploadId,
          name: task.name,
          declared_mime: task.declaredMime ?? null,
          detected_mime: task.detectedMime ?? null,
          expected_size: task.expectedSize,
          expected_etag: task.etag ?? null,
          temp_object_key: '',
          final_object_key: null,
          status: 'pending',
          upload_url: task.uploadUrl,
          upload_url_expires_at: task.uploadUrlExpiresAt ?? new Date(0).toISOString(),
          expires_at: new Date(0).toISOString(),
          created_at: new Date(0).toISOString(),
          updated_at: new Date(0).toISOString(),
        };
      } else {
        const payload: UploadSessionCreateRequest = {
          parent_id: task.parentId,
          client_upload_id: task.clientUploadId,
          declared_mime: task.declaredMime ?? null,
          name: task.name,
          size_bytes: task.expectedSize,
        };
        session = await api.createSession(payload);
        updateFromSession(store, taskId, session);
      }

      task = getTask(store, taskId);
      if (!task || task.status === 'canceled' || controller.signal.aborted) {
        if (session?.id) await api.abortSession(session.id).catch(() => undefined);
        return;
      }
      if (session.status === 'completed') {
        await markCompleted(taskId, session);
        return;
      }

      store.getState().updateTask(taskId, { status: 'uploading' });
      const result = await uploadBytes(task, session, controller);
      const latestTask = getTask(store, taskId);
      if (!latestTask || latestTask.status === 'canceled' || controller.signal.aborted)
        return;
      store.getState().updateTask(taskId, {
        etag: result.etag ?? latestTask.etag,
        progress: Math.max(latestTask.progress, 99),
        status: 'finalizing',
      });
      await complete(taskId);
    } catch (error) {
      const currentTask = getTask(store, taskId);
      if (!currentTask || currentTask.status === 'canceled' || isAbortError(error))
        return;
      const details = errorDetails(error);
      store.getState().updateTask(taskId, {
        errorCode: details.code,
        errorMessage: details.message,
        status: 'failed',
      });
    } finally {
      controllers.delete(taskId);
    }
  };

  const startUpload = (taskId: string): Promise<void> => {
    const existing = running.get(taskId);
    if (existing) return existing;
    const promise = runUpload(taskId).finally(() => {
      if (running.get(taskId) === promise) running.delete(taskId);
    });
    running.set(taskId, promise);
    return promise;
  };

  const enqueue = async (files: File[] | FileList, parentId: string): Promise<void> => {
    const tasks = normalizeFiles(files).map((file) => {
      const task = createUploadTask(file, parentId);
      store.getState().addTask(task);
      const validationMessage = validateFile(file, maxFileSizeBytes);
      if (validationMessage) {
        store.getState().updateTask(task.id, {
          errorCode: 'invalid_file',
          errorMessage: validationMessage,
          status: 'failed',
        });
      }
      return task;
    });
    await Promise.all(
      tasks
        .filter((task) => getTask(store, task.id)?.status === 'waiting')
        .map((task) => startUpload(task.id)),
    );
  };

  const retryName = async (
    taskOrId: UploadTask | string,
    name: string,
  ): Promise<void> => {
    const taskId = typeof taskOrId === 'string' ? taskOrId : taskOrId.id;
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      store.getState().updateTask(taskId, {
        errorCode: 'invalid_name',
        errorMessage: '文件名不能为空',
      });
      return;
    }
    const task = getTask(store, taskId);
    if (!task?.sessionId) {
      throw new UploadManagerError('upload_session_missing', '上传会话不存在');
    }
    store.getState().updateTask(taskId, {
      errorCode: undefined,
      errorMessage: undefined,
      name: trimmedName,
      status: 'finalizing',
    });
    await complete(taskId, trimmedName);
  };

  const retry = async (taskId: string): Promise<void> => {
    const task = getTask(store, taskId);
    if (!task || (task.status !== 'failed' && task.status !== 'canceled')) return;
    store.getState().updateTask(taskId, {
      errorCode: undefined,
      errorMessage: undefined,
      progress: task.status === 'canceled' ? 0 : task.progress,
      status: 'waiting',
    });
    await startUpload(taskId);
  };

  const cancel = async (taskId: string): Promise<void> => {
    const task = getTask(store, taskId);
    if (!task || task.status === 'completed' || task.status === 'canceled') return;
    store.getState().updateTask(taskId, {
      errorCode: undefined,
      errorMessage: undefined,
      status: 'canceled',
    });
    controllers.get(taskId)?.abort();
    if (task.sessionId) {
      await api.abortSession(task.sessionId).catch(() => undefined);
    }
  };

  return {
    cancel,
    clearCompleted: () => store.getState().clearCompleted(),
    complete,
    enqueue,
    retry,
    retryName,
    startUpload,
  };
}

export function useUploadManager({
  parentId,
  api,
  transport,
  queryClient: providedQueryClient,
  store,
  pollIntervalMs,
  maxPollAttempts,
  maxFileSizeBytes,
}: UseUploadManagerOptions): {
  tasks: UploadTask[];
  conflictTask: UploadTask | null;
  enqueueFiles: (files: File[] | FileList) => Promise<void>;
  startUpload: (taskId: string) => Promise<void>;
  complete: (taskOrId: UploadTask | string, name?: string) => Promise<void>;
  retryName: (taskOrId: UploadTask | string, name: string) => Promise<void>;
  retry: (taskId: string) => Promise<void>;
  cancel: (taskId: string) => Promise<void>;
  clearCompleted: () => void;
} {
  const queryClient = useQueryClient();
  const manager = useMemo(
    () =>
      createUploadManager({
        api,
        maxFileSizeBytes,
        maxPollAttempts,
        pollIntervalMs,
        queryClient: providedQueryClient ?? queryClient,
        store,
        transport,
      }),
    [
      api,
      maxFileSizeBytes,
      maxPollAttempts,
      pollIntervalMs,
      providedQueryClient,
      queryClient,
      store,
      transport,
    ],
  );
  const tasks = useUploadTaskStore((state) => state.tasks);
  const enqueueFiles = useCallback(
    (files: File[] | FileList) => manager.enqueue(files, parentId),
    [manager, parentId],
  );
  const conflictTask = tasks.find((task) => task.status === 'name-conflict') ?? null;

  return {
    cancel: manager.cancel,
    clearCompleted: manager.clearCompleted,
    complete: manager.complete,
    conflictTask,
    enqueueFiles,
    retry: manager.retry,
    retryName: manager.retryName,
    startUpload: manager.startUpload,
    tasks,
  };
}

export { UploadTransportError };
