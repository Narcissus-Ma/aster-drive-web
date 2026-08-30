import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  MessageResponse,
  ResourceListResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import {
  addFavorite,
  listSystemView,
  recordRecentAccess,
  removeFavorite,
  type SystemViewKind,
} from '../api/view-api';

export const systemViewQueryKeys = {
  all: ['system-views'] as const,
  view: (view: SystemViewKind) => ['system-views', view] as const,
  list: (view: SystemViewKind, limit: number) =>
    ['system-views', view, { limit }] as const,
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

export interface UseSystemViewOptions {
  limit?: number;
}

export function useSystemView(
  view: SystemViewKind,
  { limit = 50 }: UseSystemViewOptions = {},
) {
  const query = useInfiniteQuery({
    queryKey: systemViewQueryKeys.list(view, limit),
    queryFn: ({ pageParam, signal }) =>
      listSystemView({ view, cursor: pageParam, limit, signal }),
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

interface FavoriteToggleVariables {
  isFavorite: boolean;
  resourceId: string;
}

type FavoriteQueriesSnapshot = Array<
  [
    readonly unknown[],
    InfiniteData<ResourceListResponse, string | undefined> | undefined,
  ]
>;

export interface UseFavoriteToggleResult {
  isPending: boolean;
  toggle: (resourceId: string, isFavorite: boolean) => Promise<MessageResponse>;
}

export function useFavoriteToggle(): UseFavoriteToggleResult {
  const queryClient = useQueryClient();
  const mutation = useMutation<
    MessageResponse,
    unknown,
    FavoriteToggleVariables,
    { previous: FavoriteQueriesSnapshot }
  >({
    mutationFn: ({ isFavorite, resourceId }) =>
      isFavorite ? removeFavorite(resourceId) : addFavorite(resourceId),
    onMutate: async ({ isFavorite, resourceId }) => {
      await queryClient.cancelQueries({ queryKey: systemViewQueryKeys.all });
      const previous = queryClient.getQueriesData<
        InfiniteData<ResourceListResponse, string | undefined>
      >({ queryKey: systemViewQueryKeys.view('favorites') });

      if (isFavorite) {
        queryClient.setQueriesData<
          InfiniteData<ResourceListResponse, string | undefined>
        >({ queryKey: systemViewQueryKeys.view('favorites') }, (data) => {
          if (!data) return data;
          const updated = {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              items: page.items.filter((item) => item.id !== resourceId),
            })),
          };
          return updated;
        });
      }

      return { previous };
    },
    onError: (_error, _variables, context) => {
      context?.previous.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: (_data, variables) => {
      if (!variables.isFavorite) {
        void queryClient.invalidateQueries({
          queryKey: systemViewQueryKeys.view('favorites'),
        });
      }
    },
  });

  const toggle = useCallback(
    (resourceId: string, isFavorite: boolean) =>
      mutation.mutateAsync({ resourceId, isFavorite }),
    [mutation],
  );

  return { isPending: mutation.isPending, toggle };
}

export interface UseRecordRecentAccessResult {
  isPending: boolean;
  record: (resourceId: string) => Promise<ResourceResponse>;
}

export function useRecordRecentAccess(): UseRecordRecentAccessResult {
  const mutation = useMutation({ mutationFn: recordRecentAccess });
  const record = useCallback(
    (resourceId: string) => mutation.mutateAsync(resourceId),
    [mutation],
  );
  return { isPending: mutation.isPending, record };
}
