import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { ResourceRow } from '../../files/components/resource-row';
import {
  useFavoriteToggle,
  useRecordRecentAccess,
  useSystemView,
} from '../hooks/use-system-view';
import type { SystemViewKind } from '../system-views';
import styles from './system-view-page.module.css';

interface SystemViewPageProps {
  view: SystemViewKind;
}

function getViewCopy(view: SystemViewKind): {
  description: string;
  emptyStateTestId: string;
  emptyText: string;
  title: string;
} {
  if (view === 'favorites') {
    return {
      description: '集中查看你标记过的资源。',
      emptyStateTestId: 'favorites-empty-state',
      emptyText: '还没有收藏资源',
      title: '我的收藏',
    };
  }
  return {
    description: '按最近打开时间查看资源。',
    emptyStateTestId: 'recent-empty-state',
    emptyText: '还没有最近访问记录',
    title: '最近使用',
  };
}

export function SystemViewPage({ view }: SystemViewPageProps): JSX.Element {
  const navigate = useNavigate();
  const viewCopy = getViewCopy(view);
  const systemView = useSystemView(view);
  const favoriteToggle = useFavoriteToggle();
  const recentAccess = useRecordRecentAccess();

  const handleOpen = useCallback(
    async (resource: ResourceResponse) => {
      try {
        await recentAccess.record(resource.id);
      } catch {
        // 最近访问记录失败不应阻断用户打开资源。
      }
      const destination =
        resource.kind === 'folder' || resource.kind === 'root'
          ? `/drive/${encodeURIComponent(resource.id)}`
          : resource.parent_id
            ? `/drive/${encodeURIComponent(resource.parent_id)}`
            : '/drive';
      navigate(destination, { state: { openResourceId: resource.id } });
    },
    [navigate, recentAccess],
  );

  const handleFavoriteToggle = useCallback(
    (resourceId: string, nextFavorite: boolean) => {
      void favoriteToggle.toggle(resourceId, !nextFavorite).catch(() => undefined);
    },
    [favoriteToggle],
  );

  const content = systemView.isLoading ? (
    <p role="status">正在加载{viewCopy.title}…</p>
  ) : systemView.isError ? (
    <div role="alert">
      <p>
        {systemView.error instanceof Error
          ? systemView.error.message
          : `加载${viewCopy.title}失败`}
      </p>
      <button type="button" onClick={() => void systemView.refetch()}>
        重新加载
      </button>
    </div>
  ) : systemView.items.length === 0 ? (
    <p data-testid={viewCopy.emptyStateTestId}>{viewCopy.emptyText}</p>
  ) : (
    <ul className={styles.list} aria-label={`${viewCopy.title}资源列表`}>
      {systemView.items.map((resource) => (
        <ResourceRow
          key={resource.id}
          favorite={view === 'favorites'}
          onFavoriteToggle={view === 'favorites' ? handleFavoriteToggle : undefined}
          onOpen={(item) => void handleOpen(item)}
          onToggle={() => undefined}
          resource={resource}
          selected={false}
        />
      ))}
    </ul>
  );

  return (
    <main className={styles.page} data-testid={`${view}-page`}>
      <header className={styles.header}>
        <p>ASTER DRIVE</p>
        <h1>{viewCopy.title}</h1>
        <span>{viewCopy.description}</span>
      </header>
      {content}
      {systemView.hasNextPage ? (
        <button
          className={styles.loadMore}
          type="button"
          onClick={() => void systemView.loadMore()}
          disabled={systemView.isFetchingNextPage}
        >
          {systemView.isFetchingNextPage ? '正在加载更多…' : '加载更多'}
        </button>
      ) : null}
    </main>
  );
}
