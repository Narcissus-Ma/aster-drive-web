import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './search-result-list.module.css';

export interface SearchResultListProps {
  error?: unknown;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  isLoading: boolean;
  items: ResourceResponse[];
  onLoadMore?: () => void;
  onOpen: (resource: ResourceResponse) => void;
}

function getKindLabel(kind: ResourceResponse['kind']): string {
  if (kind === 'folder') return '文件夹';
  if (kind === 'document') return '文档';
  if (kind === 'file') return '文件';
  return '目录';
}

export function SearchResultList({
  error,
  hasNextPage = false,
  isFetchingNextPage = false,
  isLoading,
  items,
  onLoadMore,
  onOpen,
}: SearchResultListProps): JSX.Element {
  if (isLoading) return <p role="status">正在搜索…</p>;
  if (error) {
    return (
      <div role="alert" className={styles.feedback}>
        {error instanceof Error ? error.message : '搜索失败，请稍后重试'}
      </div>
    );
  }
  if (items.length === 0) {
    return <p className={styles.feedback}>没有找到匹配的资源</p>;
  }

  return (
    <div className={styles.wrapper}>
      <ul className={styles.list} role="listbox" aria-label="搜索结果">
        {items.map((resource) => (
          <li
            className={styles.item}
            key={resource.id}
            role="option"
            aria-selected="false"
            onClick={() => onOpen(resource)}
          >
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpen(resource);
              }}
            >
              <span aria-hidden="true">{resource.kind === 'folder' ? '📁' : '📄'}</span>
              <span className={styles.name}>{resource.name}</span>
              <span className={styles.kind}>{getKindLabel(resource.kind)}</span>
            </button>
          </li>
        ))}
      </ul>
      {hasNextPage && onLoadMore ? (
        <button
          className={styles.loadMore}
          type="button"
          onClick={onLoadMore}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? '正在加载更多…' : '加载更多结果'}
        </button>
      ) : null}
    </div>
  );
}
