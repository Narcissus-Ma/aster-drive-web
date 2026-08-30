import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import { ApiClientError } from '../../../shared/api/api-client';
import type {
  CopyOperationResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { resourceQueryKeys } from '../../files/hooks/use-folder-children';
import { copyResource, getCopyOperation } from '../api/copy-api';

const TERMINAL_STATUSES = new Set<CopyOperationResponse['status']>([
  'succeeded',
  'failed',
  'canceled',
]);

const errorMessages: Record<string, string> = {
  copy_source_forbidden: '当前用户无权读取源资源',
  copy_target_forbidden: '当前用户无权在目标目录中新建副本',
  copy_source_unavailable: '源文件暂不可用，请稍后重试',
  name_conflict: '目标目录中已存在同名资源，请修改副本名称',
  unsupported_copy_target: '暂不支持复制文件夹',
};

export interface CopyStartOptions {
  name?: string;
  targetParentId: string;
}

export interface UseCopyOperationOptions {
  maxPolls?: number;
  pollIntervalMs?: number;
}

export interface UseCopyOperationResult {
  error: unknown | null;
  errorMessage: string | null;
  isPending: boolean;
  operation: CopyOperationResponse | null;
  reset: () => void;
  start: (
    resource: ResourceResponse,
    options: CopyStartOptions,
  ) => Promise<CopyOperationResponse>;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    return (
      (error.code ? errorMessages[error.code] : undefined) ??
      error.message ??
      '复制失败，请稍后重试'
    );
  }
  if (error instanceof Error) return error.message;
  return '复制失败，请稍后重试';
}

function delay(milliseconds: number): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useCopyOperation(
  options: UseCopyOperationOptions = {},
): UseCopyOperationResult {
  const queryClient = useQueryClient();
  const [operation, setOperation] = useState<CopyOperationResponse | null>(null);
  const [operationError, setOperationError] = useState<unknown | null>(null);
  const pollIntervalMs = options.pollIntervalMs ?? 1200;
  const maxPolls = options.maxPolls ?? 120;

  const invalidateQueries = useCallback(
    async (resource: ResourceResponse, targetParentId: string) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: resourceQueryKeys.children({ parentId: targetParentId }),
        }),
        resource.parent_id
          ? queryClient.invalidateQueries({
              queryKey: resourceQueryKeys.children({ parentId: resource.parent_id }),
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ['resources', 'children'] }),
      ]);
    },
    [queryClient],
  );

  const mutation = useMutation({
    mutationFn: async ({
      resource,
      targetParentId,
      name,
    }: {
      resource: ResourceResponse;
      targetParentId: string;
      name?: string;
    }): Promise<CopyOperationResponse> => {
      let next = await copyResource(resource.id, {
        name,
        target_parent_id: targetParentId,
        version: resource.version,
      });
      setOperation(next);
      if (TERMINAL_STATUSES.has(next.status) || !next.operation_id) {
        await invalidateQueries(resource, targetParentId);
        return next;
      }
      const operationId = next.operation_id;

      for (let attempt = 0; attempt < maxPolls; attempt += 1) {
        await delay(pollIntervalMs);
        next = await getCopyOperation(operationId);
        setOperation(next);
        if (TERMINAL_STATUSES.has(next.status)) {
          await invalidateQueries(resource, targetParentId);
          return next;
        }
      }
      throw new Error('复制任务等待超时，请稍后查看进度');
    },
    onError: (error) => {
      setOperationError(error);
    },
    onSuccess: (next) => {
      setOperation(next);
      setOperationError(null);
    },
  });

  const start = useCallback(
    async (resource: ResourceResponse, startOptions: CopyStartOptions) => {
      setOperationError(null);
      setOperation(null);
      return mutation.mutateAsync({
        name: startOptions.name,
        resource,
        targetParentId: startOptions.targetParentId,
      });
    },
    [mutation],
  );

  const reset = useCallback(() => {
    setOperation(null);
    setOperationError(null);
    mutation.reset();
  }, [mutation]);

  return {
    error: operationError,
    errorMessage: operationError ? toErrorMessage(operationError) : null,
    isPending: mutation.isPending,
    operation,
    reset,
    start,
  };
}
