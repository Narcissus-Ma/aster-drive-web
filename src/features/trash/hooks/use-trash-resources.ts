import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useMemo } from 'react';

import type {
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import {
  listTrashResources,
  type ListTrashResourcesParams,
} from '../../file-operations/api/file-operation-api';

export const trashQueryKeys = {
  all: ['resources', 'trash'] as const,
  list: (params: ListTrashResourcesParams = {}) =>
    ['resources', 'trash', params] as const,
};

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

export interface UseTrashResourcesOptions {
  limit?: number;
}

export function useTrashResources({ limit = 50 }: UseTrashResourcesOptions = {}) {
  const query = useInfiniteQuery({
    queryKey: trashQueryKeys.list({ limit }),
    queryFn: ({ pageParam }) => listTrashResources({ cursor: pageParam, limit }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
  const items = useMemo(() => mergePages(query.data), [query.data]);

  return {
    ...query,
    items,
    loadMore: query.fetchNextPage,
  };
}
