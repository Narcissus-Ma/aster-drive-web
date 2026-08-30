import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { ResourceRow } from '../../files/components/resource-row';
import { useSharedWithMe } from '../hooks/use-sharing';
import styles from './shared-with-me-page.module.css';

function roleLabel(role: string): string {
  if (role === 'editor') return '可编辑';
  if (role === 'owner') return '所有者';
  return '查看';
}

export function SharedWithMePage(): JSX.Element {
  const navigate = useNavigate();
  const shared = useSharedWithMe();

  const handleOpen = useCallback(
    (resource: ResourceResponse) => {
      if (resource.kind === 'folder' || resource.kind === 'root') {
        navigate(`/drive/${encodeURIComponent(resource.id)}`);
        return;
      }
      if (resource.kind === 'document') {
        navigate(`/documents/${encodeURIComponent(resource.id)}`, {
          state: { resourceName: resource.name },
        });
        return;
      }
      const parentPath = resource.parent_id
        ? `/drive/${encodeURIComponent(resource.parent_id)}`
        : '/drive';
      navigate(parentPath, { state: { openResourceId: resource.id } });
    },
    [navigate],
  );

  let content: JSX.Element;
  if (shared.isLoading) {
    content = (
      <p className={styles.feedback} role="status">
        正在加载与我共享…
      </p>
    );
  } else if (shared.isError) {
    content = (
      <div role="alert">
        <p>
          {shared.error instanceof Error ? shared.error.message : '加载与我共享失败'}
        </p>
        <button type="button" onClick={() => void shared.refetch()}>
          重新加载
        </button>
      </div>
    );
  } else if (shared.items.length === 0) {
    content = (
      <p className={styles.feedback} data-testid="shared-empty-state">
        还没有共享给你的资源
      </p>
    );
  } else {
    content = (
      <ul className={styles.list} aria-label="与我共享资源列表">
        {shared.items.map((item) => (
          <ResourceRow
            key={`${item.resource.id}-${item.grant.id}`}
            metaLabel={roleLabel(item.effective_role)}
            onOpen={handleOpen}
            onToggle={() => undefined}
            resource={item.resource}
            selected={false}
          />
        ))}
      </ul>
    );
  }

  return (
    <main className={styles.page} data-testid="shared-with-me-page">
      <header className={styles.header}>
        <p>ASTER DRIVE</p>
        <h1>与我共享</h1>
        <span>查看其他成员授予你的文件和文件夹。</span>
      </header>
      {content}
      {shared.hasNextPage ? (
        <button
          className={styles.loadMore}
          type="button"
          disabled={shared.isFetchingNextPage}
          onClick={() => void shared.loadMore()}
        >
          {shared.isFetchingNextPage ? '正在加载更多…' : '加载更多'}
        </button>
      ) : null}
    </main>
  );
}
