import { QueryClient } from '@tanstack/react-query';
import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../../shared/api/api-client';
import type { UploadSessionResponse } from '../../../shared/api/generated/openapi';
import type { UploadTransportResult } from '../api/upload-api';
import { createUploadTask } from '../models/upload-task';
import { useUploadTaskStore } from '../store/upload-task-store';
import {
  createUploadManager,
  UploadTransportError,
  type UploadApi,
  type UploadTransport,
} from './use-upload-manager';

function createSession(
  overrides: Partial<UploadSessionResponse> = {},
): UploadSessionResponse {
  return {
    id: 'session-1',
    user_id: 'user-1',
    parent_id: 'folder-1',
    resource_id: null,
    client_upload_id: 'client-1',
    name: '报告.txt',
    declared_mime: 'text/plain',
    detected_mime: null,
    expected_size: 5,
    expected_etag: null,
    temp_object_key: 'tmp/session-1',
    final_object_key: null,
    status: 'pending',
    upload_url: 'https://storage.example/upload/session-1',
    upload_url_expires_at: '2099-01-01T00:00:00Z',
    expires_at: '2099-01-01T00:00:00Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

function createApi(): UploadApi {
  return {
    createSession: vi.fn(async () => createSession()),
    getSession: vi.fn(async () =>
      createSession({ status: 'completed', resource_id: 'resource-1' }),
    ),
    renewSession: vi.fn(async () =>
      createSession({ upload_url: 'https://storage.example/upload/renewed' }),
    ),
    completeSession: vi.fn(async () =>
      createSession({ status: 'completed', resource_id: 'resource-1' }),
    ),
    abortSession: vi.fn(async () => createSession({ status: 'aborted' })),
  };
}

function createTransport(): UploadTransport {
  return vi.fn(async (_url, file, options) => {
    options.onProgress?.(Math.floor(file.size / 2), file.size);
    options.onProgress?.(file.size, file.size);
    return { etag: 'etag-1' };
  });
}

describe('上传任务管理器', () => {
  afterEach(() => {
    useUploadTaskStore.getState().reset();
  });

  it('完成上传并在 202 finalizing 后轮询，同时精确失效目录 Query', async () => {
    const api = createApi();
    vi.mocked(api.completeSession).mockResolvedValueOnce(
      createSession({ status: 'finalizing', resource_id: null }),
    );
    const transport = createTransport();
    const queryClient = new QueryClient();
    const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
    const manager = createUploadManager({
      api,
      transport,
      queryClient,
      pollIntervalMs: 0,
    });
    const file = new File(['hello'], '报告.txt', { type: 'text/plain' });

    await act(async () => {
      await manager.enqueue([file], 'folder-1');
    });

    await waitFor(() => {
      expect(useUploadTaskStore.getState().tasks[0]?.status).toBe('completed');
    });

    const task = useUploadTaskStore.getState().tasks[0];
    expect(task).toMatchObject({
      progress: 100,
      resourceId: 'resource-1',
      etag: 'etag-1',
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['resources', 'children', { parentId: 'folder-1' }],
    });
  });

  it('预签名地址失效时续签并重试字节上传', async () => {
    const api = createApi();
    const transport = vi
      .fn<UploadTransport>()
      .mockRejectedValueOnce(new UploadTransportError('上传地址已失效', 403))
      .mockResolvedValueOnce({ etag: 'etag-renewed' });
    const manager = createUploadManager({
      api,
      transport,
      queryClient: new QueryClient(),
      pollIntervalMs: 0,
    });

    await act(async () => {
      await manager.enqueue(
        [new File(['hello'], '续签.txt', { type: 'text/plain' })],
        'folder-1',
      );
    });

    await waitFor(() => {
      expect(useUploadTaskStore.getState().tasks[0]?.status).toBe('completed');
    });
    expect(api.renewSession).toHaveBeenCalledTimes(1);
    expect(transport).toHaveBeenNthCalledWith(
      2,
      'https://storage.example/upload/renewed',
      expect.any(File),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('名称冲突后复用同一个 session 改名完成，不重新创建 session', async () => {
    const api = createApi();
    const completeSession = vi
      .mocked(api.completeSession)
      .mockRejectedValueOnce(
        new ApiClientError('文件名已存在', { status: 409, code: 'name_conflict' }),
      )
      .mockResolvedValueOnce(
        createSession({ status: 'completed', resource_id: 'resource-2' }),
      );
    const manager = createUploadManager({
      api,
      transport: createTransport(),
      queryClient: new QueryClient(),
      pollIntervalMs: 0,
    });
    const file = new File(['hello'], '报告.txt', { type: 'text/plain' });

    const task = createUploadTask(file, 'folder-1');
    act(() => {
      useUploadTaskStore.getState().addTask(task);
    });
    await manager.startUpload(task.id);
    await waitFor(() => {
      expect(useUploadTaskStore.getState().tasks[0]?.status).toBe('name-conflict');
    });

    await manager.retryName(task.id, '报告 2.txt');

    expect(useUploadTaskStore.getState().tasks[0]).toMatchObject({
      name: '报告 2.txt',
      status: 'completed',
      resourceId: 'resource-2',
    });
    expect(api.createSession).toHaveBeenCalledTimes(1);
    expect(completeSession).toHaveBeenLastCalledWith(
      'session-1',
      expect.objectContaining({ name: '报告 2.txt', etag: 'etag-1' }),
    );
  });

  it('取消进行中的任务时中止上传 session 并保持 canceled 状态', async () => {
    const api = createApi();
    const transport: UploadTransport = vi.fn(
      (_url, _file, options) =>
        new Promise<UploadTransportResult>((_resolve, reject) => {
          options.signal?.addEventListener('abort', () =>
            reject(new DOMException('已取消', 'AbortError')),
          );
        }),
    );
    const manager = createUploadManager({
      api,
      transport,
      queryClient: new QueryClient(),
    });
    const file = new File(['hello'], '取消.txt', { type: 'text/plain' });

    const enqueuePromise = manager.enqueue([file], 'folder-1');
    await waitFor(() => {
      expect(useUploadTaskStore.getState().tasks[0]?.status).toBe('uploading');
    });

    await manager.cancel(useUploadTaskStore.getState().tasks[0].id);
    await enqueuePromise;

    expect(api.abortSession).toHaveBeenCalledWith('session-1');
    expect(useUploadTaskStore.getState().tasks[0]?.status).toBe('canceled');
  });
});
