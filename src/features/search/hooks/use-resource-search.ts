import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import type {
  ResourceKind,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { searchResources } from '../../system-views/system-views';

export interface ResourceSearchOptions {
  query: string;
  kind?: ResourceKind;
  updatedFrom?: string;
  updatedTo?: string;
  limit?: number;
}

function mergePages(
  data: InfiniteData<ResourceListResponse, unknown> | undefined,
): ResourceResponse[] {
  const seen = new Set<string>();
  const items: ResourceResponse[] = [];
  for (const page of data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }
  return items;
}

export function useResourceSearch({
  query,
  kind,
  updatedFrom,
  updatedTo,
  limit = 50,
}: ResourceSearchOptions) {
  const normalizedQuery = query.trim();
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(normalizedQuery), 300);
    return () => window.clearTimeout(timer);
  }, [normalizedQuery]);

  const searchQuery = useInfiniteQuery({
    queryKey: [
      'resource-search',
      { query: debouncedQuery, kind, updatedFrom, updatedTo, limit },
    ],
    queryFn: ({ pageParam, signal }) =>
      searchResources({
        query: debouncedQuery,
        kind,
        updatedFrom,
        updatedTo,
        cursor: pageParam,
        limit,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: debouncedQuery.length > 0,
  });
  const items = useMemo(
    () => (normalizedQuery === debouncedQuery ? mergePages(searchQuery.data) : []),
    [debouncedQuery, normalizedQuery, searchQuery.data],
  );

  return {
    ...searchQuery,
    debouncedQuery,
    items,
    loadMore: searchQuery.fetchNextPage,
  };
}
