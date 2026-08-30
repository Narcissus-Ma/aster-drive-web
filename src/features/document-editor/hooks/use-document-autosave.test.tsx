import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ApiClientError } from '../../../shared/api/api-client';
import type { DocumentContentResponse } from '../../../shared/api/generated/openapi';
import type { DocumentContent } from '../models/document-content';
import { useDocumentAutosave } from './use-document-autosave';

const firstContent: DocumentContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};
const secondContent: DocumentContent = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: '第二版' }] }],
};

function saved(content: DocumentContent, revision: number): DocumentContentResponse {
  return {
    resource_id: 'resource-a',
    content,
    revision,
    content_hash: `hash-${revision}`,
    effective_role: 'editor',
    capabilities: { can_edit_content: true, can_download: true },
  };
}

describe('文档自动保存状态机', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('编辑后按防抖时间保存最新内容', async () => {
    vi.useFakeTimers();
    const save = vi.fn(async (content: DocumentContent, revision: number) =>
      saved(content, revision + 1),
    );
    const { result, rerender } = renderHook(
      ({ content }: { content: DocumentContent }) =>
        useDocumentAutosave({
          content,
          revision: 1,
          save,
          debounceMs: 1000,
        }),
      { initialProps: { content: firstContent } },
    );

    rerender({ content: secondContent });
    expect(result.current.status).toBe('dirty');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(save).not.toHaveBeenCalled();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    vi.useRealTimers();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledWith(secondContent, 1, expect.any(String));
    expect(result.current.status).toBe('saved');
  });

  it('保存期间再次编辑会在首轮完成后继续保存', async () => {
    vi.useFakeTimers();
    let resolveFirst: ((value: DocumentContentResponse) => void) | undefined;
    const save = vi
      .fn<
        (
          content: DocumentContent,
          revision: number,
          idempotencyKey: string,
        ) => Promise<DocumentContentResponse>
      >()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementation(async (content, revision) => saved(content, revision + 1));
    const { result, rerender } = renderHook(
      ({ content }: { content: DocumentContent }) =>
        useDocumentAutosave({ content, revision: 1, save, debounceMs: 10 }),
      { initialProps: { content: firstContent } },
    );

    rerender({ content: secondContent });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    expect(result.current.status).toBe('saving');

    const thirdContent: DocumentContent = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '第三版' }] }],
    };
    rerender({ content: thirdContent });
    resolveFirst?.(saved(secondContent, 2));
    await act(async () => {
      await Promise.resolve();
      await vi.advanceTimersByTimeAsync(0);
    });

    vi.useRealTimers();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(save.mock.calls[1]?.[0]).toEqual(thirdContent);
    expect(result.current.status).toBe('saved');
  });

  it('网络错误会重试而版本冲突会停止自动覆盖', async () => {
    vi.useFakeTimers();
    const conflict = new ApiClientError('版本冲突', {
      status: 409,
      code: 'document_revision_conflict',
    });
    const save = vi
      .fn<
        (
          content: DocumentContent,
          revision: number,
          idempotencyKey: string,
        ) => Promise<DocumentContentResponse>
      >()
      .mockRejectedValueOnce(new Error('网络暂时不可用'))
      .mockResolvedValueOnce(saved(secondContent, 2))
      .mockRejectedValueOnce(conflict);
    const onConflict = vi.fn();
    const { result, rerender } = renderHook(
      ({ content }: { content: DocumentContent }) =>
        useDocumentAutosave({
          content,
          revision: 1,
          save,
          debounceMs: 10,
          maxRetries: 1,
          onConflict,
        }),
      { initialProps: { content: firstContent } },
    );

    rerender({ content: secondContent });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    vi.useRealTimers();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
    expect(result.current.status).toBe('saved');

    const thirdContent = { ...secondContent, title: '第三次编辑' };
    vi.useFakeTimers();
    rerender({ content: thirdContent });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });
    vi.useRealTimers();
    await waitFor(() => expect(onConflict).toHaveBeenCalledWith(conflict));
    expect(result.current.status).toBe('conflict');
  });

  it('flush 会立即提交尚未防抖的内容', async () => {
    const save = vi.fn(async (content: DocumentContent, revision: number) =>
      saved(content, revision + 1),
    );
    const { result, rerender } = renderHook(
      ({ content }: { content: DocumentContent }) =>
        useDocumentAutosave({ content, revision: 1, save, debounceMs: 1000 }),
      { initialProps: { content: firstContent } },
    );

    rerender({ content: secondContent });
    await act(async () => {
      await result.current.flush();
    });

    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe('saved');
  });
});
