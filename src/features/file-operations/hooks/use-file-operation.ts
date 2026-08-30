import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';

import { ApiClientError } from '../../../shared/api/api-client';
import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { getResourceDetail } from '../../files/api/resource-api';
import { resourceQueryKeys } from '../../files/hooks/use-folder-children';
import {
  moveResource,
  purgeResource,
  renameResource,
  restoreResource,
  trashResource,
} from '../api/file-operation-api';

export type FileOperationKind = 'move' | 'purge' | 'rename' | 'restore' | 'trash';

export interface FileOperationError {
  error: unknown;
  kind: FileOperationKind;
  resourceId: string;
}

const errorMessages: Record<string, string> = {
  invalid_resource_parent: '不能移动到自身或后代目录',
  move_forbidden: '当前用户无权移动该资源',
  name_conflict: '同一目录下已存在同名资源，请输入其他名称',
  protected_resource: '系统资源不能删除或移动',
  rename_forbidden: '当前用户无权重命名该资源',
  resource_trashed: '资源已在回收站或处于清理状态',
  resource_version_conflict: '资源已被其他操作更新，请刷新后重试',
  structural_root_required: '共享结构根只能由所有者删除',
  trash_forbidden: '当前用户无权删除该资源',
  trash_owner_required: '只有资源所有者可以操作回收站',
};

export function getFileOperationErrorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    const code = error.code;
    return (code && errorMessages[code]) || error.message || '操作失败，请稍后重试';
  }
  if (error instanceof Error) return error.message;
  return '操作失败，请稍后重试';
}

function isVersionConflict(error: unknown): error is ApiClientError {
  return error instanceof ApiClientError && error.code === 'resource_version_conflict';
}

export interface UseFileOperationResult {
  error: FileOperationError | null;
  errorMessage: string | null;
  isPending: boolean;
  move: (
    resource: ResourceResponse,
    targetParentId: string,
  ) => Promise<ResourceResponse>;
  purge: (resource: ResourceResponse) => Promise<ResourceResponse>;
  rename: (resource: ResourceResponse, name: string) => Promise<ResourceResponse>;
  reset: () => void;
  restore: (resource: ResourceResponse) => Promise<ResourceResponse>;
  trash: (resource: ResourceResponse) => Promise<ResourceResponse>;
}

export function useFileOperation(): UseFileOperationResult {
  const queryClient = useQueryClient();
  const [operationError, setOperationError] = useState<FileOperationError | null>(null);
  const renameMutation = useMutation({
    mutationFn: ({ resource, name }: { resource: ResourceResponse; name: string }) =>
      renameResource(resource.id, { name, version: resource.version }),
  });
  const moveMutation = useMutation({
    mutationFn: ({
      resource,
      targetParentId,
    }: {
      resource: ResourceResponse;
      targetParentId: string;
    }) =>
      moveResource(resource.id, {
        target_parent_id: targetParentId,
        version: resource.version,
      }),
  });
  const trashMutation = useMutation({
    mutationFn: (resource: ResourceResponse) =>
      trashResource(resource.id, { version: resource.version }),
  });
  const restoreMutation = useMutation({
    mutationFn: (resource: ResourceResponse) =>
      restoreResource(resource.id, { version: resource.version }),
  });
  const purgeMutation = useMutation({
    mutationFn: (resource: ResourceResponse) =>
      purgeResource(resource.id, { version: resource.version }),
  });

  const invalidateResourceQueries = useCallback(
    async (resource: ResourceResponse, targetParentId?: string) => {
      const parentIds = new Set<string>();
      if (resource.parent_id) parentIds.add(resource.parent_id);
      if (targetParentId) parentIds.add(targetParentId);
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: resourceQueryKeys.detail(resource.id),
        }),
        ...Array.from(parentIds, (parentId) =>
          queryClient.invalidateQueries({
            queryKey: resourceQueryKeys.children({ parentId }),
          }),
        ),
        queryClient.invalidateQueries({ queryKey: ['resources', 'children'] }),
        queryClient.invalidateQueries({ queryKey: ['resources', 'trash'] }),
      ]);
    },
    [queryClient],
  );

  const refreshVersionConflict = useCallback(
    async (resourceId: string) => {
      await queryClient.invalidateQueries({
        queryKey: resourceQueryKeys.detail(resourceId),
      });
      try {
        await queryClient.fetchQuery({
          queryKey: resourceQueryKeys.detail(resourceId),
          queryFn: () => getResourceDetail(resourceId),
          staleTime: 0,
        });
      } catch {
        // 资源可能已经被移入回收站，保留原始冲突错误供对话框展示。
      }
      await queryClient.invalidateQueries({ queryKey: ['resources', 'children'] });
    },
    [queryClient],
  );

  const run = useCallback(
    async <T>(
      kind: FileOperationKind,
      resource: ResourceResponse,
      action: () => Promise<T>,
      targetParentId?: string,
    ): Promise<T> => {
      setOperationError(null);
      try {
        const result = await action();
        await invalidateResourceQueries(resource, targetParentId);
        return result;
      } catch (error) {
        if (isVersionConflict(error)) {
          await refreshVersionConflict(resource.id);
        }
        setOperationError({ error, kind, resourceId: resource.id });
        throw error;
      }
    },
    [invalidateResourceQueries, refreshVersionConflict],
  );

  const rename = useCallback(
    (resource: ResourceResponse, name: string) =>
      run('rename', resource, () => renameMutation.mutateAsync({ resource, name })),
    [renameMutation, run],
  );
  const move = useCallback(
    (resource: ResourceResponse, targetParentId: string) =>
      run(
        'move',
        resource,
        () => moveMutation.mutateAsync({ resource, targetParentId }),
        targetParentId,
      ),
    [moveMutation, run],
  );
  const trash = useCallback(
    (resource: ResourceResponse) =>
      run('trash', resource, () => trashMutation.mutateAsync(resource)),
    [run, trashMutation],
  );
  const restore = useCallback(
    (resource: ResourceResponse) =>
      run('restore', resource, () => restoreMutation.mutateAsync(resource)),
    [restoreMutation, run],
  );
  const purge = useCallback(
    (resource: ResourceResponse) =>
      run('purge', resource, () => purgeMutation.mutateAsync(resource)),
    [purgeMutation, run],
  );
  const reset = useCallback(() => {
    setOperationError(null);
    renameMutation.reset();
    moveMutation.reset();
    trashMutation.reset();
    restoreMutation.reset();
    purgeMutation.reset();
  }, [moveMutation, purgeMutation, renameMutation, restoreMutation, trashMutation]);

  const isPending = useMemo(
    () =>
      renameMutation.isPending ||
      moveMutation.isPending ||
      trashMutation.isPending ||
      restoreMutation.isPending ||
      purgeMutation.isPending,
    [
      moveMutation.isPending,
      purgeMutation.isPending,
      renameMutation.isPending,
      restoreMutation.isPending,
      trashMutation.isPending,
    ],
  );

  return {
    error: operationError,
    errorMessage: operationError
      ? getFileOperationErrorMessage(operationError.error)
      : null,
    isPending,
    move,
    purge,
    rename,
    reset,
    restore,
    trash,
  };
}
