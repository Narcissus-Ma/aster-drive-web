import { describe, expect, it } from 'vitest';

import { createUploadTask } from './upload-task';

describe('上传任务模型', () => {
  it('根据文件和父目录创建 waiting 任务', () => {
    const file = new File(['hello'], '报告.txt', { type: 'text/plain' });

    const task = createUploadTask(file, 'folder-1');

    expect(task).toMatchObject({
      parentId: 'folder-1',
      name: '报告.txt',
      expectedSize: file.size,
      declaredMime: 'text/plain',
      progress: 0,
      status: 'waiting',
    });
    expect(task.id).toBeTruthy();
    expect(task.clientUploadId).toBeTruthy();
  });
});
