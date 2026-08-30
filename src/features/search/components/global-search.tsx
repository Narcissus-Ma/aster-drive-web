import { useCallback, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import type {
  ResourceKind,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { useRecordRecentAccess } from '../../system-views/hooks/use-system-view';
import { SearchResultList } from './search-result-list';
import { useResourceSearch } from '../hooks/use-resource-search';
import styles from './global-search.module.css';

const resourceKinds: Array<{ label: string; value: ResourceKind }> = [
  { label: '全部类型', value: 'root' },
  { label: '文件夹', value: 'folder' },
  { label: '文档', value: 'document' },
  { label: '文件', value: 'file' },
];

function parseKind(value: string | null): ResourceKind | undefined {
  if (!value || value === 'root') return undefined;
  return value === 'folder' || value === 'document' || value === 'file'
    ? value
    : undefined;
}

export function GlobalSearch(): JSX.Element {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const recentAccess = useRecordRecentAccess();
  const query = searchParams.get('q') ?? '';
  const kind = parseKind(searchParams.get('kind'));
  const updatedFrom = searchParams.get('updated_from') ?? undefined;
  const updatedTo = searchParams.get('updated_to') ?? undefined;
  const searchQuery = useResourceSearch({ query, kind, updatedFrom, updatedTo });
  const hasQuery = query.trim().length > 0;

  const updateParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(searchParams);
      if (value === '') next.delete(key);
      else next.set(key, value);
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  }, []);

  const handleOpen = useCallback(
    async (resource: ResourceResponse) => {
      try {
        await recentAccess.record(resource.id);
      } catch {
        // 最近访问记录失败不应阻断用户打开搜索结果。
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

  return (
    <form className={styles.search} role="search" onSubmit={handleSubmit}>
      <div className={styles.controls}>
        <label className={styles.queryLabel}>
          <span className={styles.visuallyHidden}>全局搜索</span>
          <input
            aria-label="全局搜索"
            type="search"
            value={query}
            placeholder="搜索文件、文档和文件夹"
            onChange={(event) => updateParam('q', event.target.value)}
          />
        </label>
        <label>
          <span className={styles.visuallyHidden}>资源类型</span>
          <select
            aria-label="资源类型"
            value={searchParams.get('kind') ?? 'root'}
            onChange={(event) =>
              updateParam(
                'kind',
                event.target.value === 'root' ? '' : event.target.value,
              )
            }
          >
            {resourceKinds.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={styles.visuallyHidden}>更新时间起点</span>
          <input
            aria-label="更新时间起点"
            type="datetime-local"
            value={updatedFrom ?? ''}
            onChange={(event) => updateParam('updated_from', event.target.value)}
          />
        </label>
        <label>
          <span className={styles.visuallyHidden}>更新时间终点</span>
          <input
            aria-label="更新时间终点"
            type="datetime-local"
            value={updatedTo ?? ''}
            onChange={(event) => updateParam('updated_to', event.target.value)}
          />
        </label>
        {hasQuery ? (
          <button type="button" onClick={() => updateParam('q', '')}>
            清除
          </button>
        ) : null}
      </div>
      {hasQuery ? (
        <div className={styles.results}>
          <SearchResultList
            error={searchQuery.error}
            hasNextPage={searchQuery.hasNextPage}
            isFetchingNextPage={searchQuery.isFetchingNextPage}
            isLoading={searchQuery.isLoading || searchQuery.isFetching}
            items={searchQuery.items}
            onLoadMore={() => void searchQuery.loadMore()}
            onOpen={handleOpen}
          />
        </div>
      ) : null}
    </form>
  );
}
