import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { ApiClientError } from '../../../shared/api/api-client';
import type {
  ResourceKind,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import {
  getResourceDetail,
  listFolderChildren,
  type ResourceSortBy,
  type ResourceSortDirection,
} from '../api/resource-api';

export interface FolderChildrenQuery {
  parentId: string;
  kind?: ResourceKind;
  updatedFrom?: string;
  updatedTo?: string;
  sortBy?: ResourceSortBy;
  sortDirection?: ResourceSortDirection;
}

export const resourceQueryKeys = {
  all: ['resources'] as const,
  children: (query: FolderChildrenQuery) => ['resources', 'children', query] as const,
  detail: (resourceId: string) => ['resources', 'detail', resourceId] as const,
};

function mergeResourcePages(
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

export interface ResourceRecoveryOptions {
  currentPath?: string;
  error: unknown;
  fallbackPath?: string;
  navigate?: (to: string, options?: { replace?: boolean }) => void;
  parentId: string;
  queryClient: ReturnType<typeof useQueryClient>;
  resourceId?: string;
}

export async function recoverResourceAccessError({
  currentPath,
  error,
  fallbackPath,
  navigate,
  parentId,
  queryClient,
  resourceId,
}: ResourceRecoveryOptions): Promise<ResourceResponse | undefined> {
  if (!(error instanceof ApiClientError)) {
    return undefined;
  }

  if (error.status === 403) {
    const detailId = resourceId ?? parentId;
    try {
      const detail = await queryClient.fetchQuery({
        queryKey: resourceQueryKeys.detail(detailId),
        queryFn: () => getResourceDetail(detailId),
        staleTime: 0,
      });
      await queryClient.invalidateQueries({
        queryKey: [...resourceQueryKeys.all, 'children'],
      });
      return detail;
    } catch {
      return undefined;
    }
  }

  if (error.status === 404) {
    queryClient.removeQueries({
      queryKey: resourceQueryKeys.detail(resourceId ?? parentId),
      type: 'inactive',
    });
    queryClient.removeQueries({
      queryKey: ['resources', 'children'],
      type: 'inactive',
    });
    const targetPath =
      fallbackPath ??
      (resourceId && resourceId !== parentId
        ? `/drive/${encodeURIComponent(parentId)}`
        : '/drive');
    if (targetPath !== currentPath) {
      navigate?.(targetPath, { replace: true });
    }
  }

  return undefined;
}

export function useFolderChildren(query: FolderChildrenQuery) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const handledErrorRef = useRef<unknown>(null);
  const childrenQuery = useInfiniteQuery({
    queryKey: resourceQueryKeys.children(query),
    queryFn: ({ pageParam }) =>
      listFolderChildren({
        ...query,
        cursor: pageParam,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
    enabled: query.parentId.length > 0,
    retry: false,
  });

  const items = useMemo(
    () => mergeResourcePages(childrenQuery.data),
    [childrenQuery.data],
  );

  useEffect(() => {
    if (!childrenQuery.error || handledErrorRef.current === childrenQuery.error) {
      return;
    }
    handledErrorRef.current = childrenQuery.error;
    void recoverResourceAccessError({
      error: childrenQuery.error,
      currentPath: location.pathname,
      fallbackPath: '/drive',
      navigate,
      parentId: query.parentId,
      queryClient,
    });
  }, [childrenQuery.error, location.pathname, navigate, query.parentId, queryClient]);

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = childrenQuery;
  const loadMore = useCallback(async () => {
    if (hasNextPage && !isFetchingNextPage) {
      await fetchNextPage();
    }
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  return {
    ...childrenQuery,
    items,
    loadMore,
  };
}
