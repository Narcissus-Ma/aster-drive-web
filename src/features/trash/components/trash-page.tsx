import { useCallback, useMemo, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { DeleteConfirmDialog } from '../../file-operations/components/delete-confirm-dialog';
import { useFileOperation } from '../../file-operations/hooks/use-file-operation';
import { RestoreConflictDialog } from './restore-conflict-dialog';
import { useTrashResources } from '../hooks/use-trash-resources';
import styles from './trash-page.module.css';

function isNameConflict(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'name_conflict';
}

export function TrashPage(): JSX.Element {
  const trashQuery = useTrashResources();
  const operation = useFileOperation();
  const [restoreConflict, setRestoreConflict] = useState<ResourceResponse | null>(null);
  const [purgeResource, setPurgeResource] = useState<ResourceResponse | null>(null);

  const handleRestore = useCallback(
    async (resource: ResourceResponse) => {
      operation.reset();
      try {
        await operation.restore(resource);
      } catch (error) {
        if (isNameConflict(error)) setRestoreConflict(resource);
      }
    },
    [operation],
  );

  const handleRetryRestore = useCallback(async () => {
    if (!restoreConflict) return;
    try {
      await operation.restore(restoreConflict);
      setRestoreConflict(null);
    } catch {
      // 保留对话框，等待用户处理原目录冲突后重试。
    }
  }, [operation, restoreConflict]);

  const handlePurge = useCallback(async () => {
    if (!purgeResource) return;
    try {
      await operation.purge(purgeResource);
      setPurgeResource(null);
    } catch {
      // 删除错误显示在确认对话框中，并保留二次确认状态。
    }
  }, [operation, purgeResource]);

  const content = useMemo(() => {
    if (trashQuery.isLoading) return <p role="status">正在加载回收站…</p>;
    if (trashQuery.isError) {
      return (
        <div role="alert">
          <p>
            {trashQuery.error instanceof Error
              ? trashQuery.error.message
              : '加载回收站失败'}
          </p>
          <button type="button" onClick={() => void trashQuery.refetch()}>
            重新加载
          </button>
        </div>
      );
    }
    if (trashQuery.items.length === 0)
      return <p data-testid="trash-empty-state">回收站为空</p>;
    return (
      <ul aria-label="回收站资源" className={styles.list}>
        {trashQuery.items.map((resource) => (
          <li className={styles.item} key={resource.id}>
            <div>
              <strong>{resource.name}</strong>
              <span>{resource.kind === 'folder' ? '文件夹' : '文件'}</span>
              <time dateTime={resource.deleted_at ?? resource.updated_at}>
                {new Date(
                  resource.deleted_at ?? resource.updated_at,
                ).toLocaleDateString('zh-CN')}
              </time>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                onClick={() => void handleRestore(resource)}
                disabled={operation.isPending}
              >
                恢复{resource.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  operation.reset();
                  setPurgeResource(resource);
                }}
                disabled={operation.isPending}
              >
                永久删除{resource.name}
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  }, [handleRestore, operation, trashQuery]);

  return (
    <main className={styles.page} data-testid="trash-page">
      <header className={styles.header}>
        <p>ASTER DRIVE</p>
        <h1>回收站</h1>
        <span>资源恢复后会回到原目录，永久删除后无法恢复。</span>
      </header>
      {content}
      {trashQuery.hasNextPage ? (
        <button
          type="button"
          onClick={() => void trashQuery.loadMore()}
          disabled={trashQuery.isFetchingNextPage}
        >
          {trashQuery.isFetchingNextPage ? '正在加载更多…' : '加载更多'}
        </button>
      ) : null}
      <RestoreConflictDialog
        errorMessage={
          operation.error?.kind === 'restore' ? operation.errorMessage : null
        }
        isSubmitting={operation.isPending}
        onCancel={() => {
          setRestoreConflict(null);
          operation.reset();
        }}
        onRetry={handleRetryRestore}
        resource={restoreConflict}
      />
      <DeleteConfirmDialog
        errorMessage={operation.error?.kind === 'purge' ? operation.errorMessage : null}
        isSubmitting={operation.isPending}
        mode="purge"
        onCancel={() => {
          setPurgeResource(null);
          operation.reset();
        }}
        onConfirm={handlePurge}
        resource={purgeResource}
      />
    </main>
  );
}
