import { act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createUploadTask } from '../models/upload-task';
import { useUploadTaskStore } from './upload-task-store';

describe('上传任务 store', () => {
  afterEach(() => {
    useUploadTaskStore.getState().reset();
  });

  it('支持新增、更新、删除和清理已完成任务', () => {
    const first = createUploadTask(
      new File(['one'], '一.txt', { type: 'text/plain' }),
      'folder-1',
    );
    const second = createUploadTask(
      new File(['two'], '二.txt', { type: 'text/plain' }),
      'folder-1',
    );

    act(() => {
      useUploadTaskStore.getState().addTask(first);
      useUploadTaskStore.getState().addTask(second);
      useUploadTaskStore.getState().updateTask(first.id, {
        status: 'completed',
        progress: 100,
      });
    });

    expect(useUploadTaskStore.getState().tasks).toHaveLength(2);
    expect(useUploadTaskStore.getState().tasks[0]).toMatchObject({
      status: 'completed',
      progress: 100,
    });

    act(() => {
      useUploadTaskStore.getState().clearCompleted();
    });

    expect(useUploadTaskStore.getState().tasks.map((task) => task.id)).toEqual([
      second.id,
    ]);

    act(() => {
      useUploadTaskStore.getState().removeTask(second.id);
    });

    expect(useUploadTaskStore.getState().tasks).toEqual([]);
  });
});
