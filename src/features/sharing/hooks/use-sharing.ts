import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

import type {
  GrantCreateRequest,
  GrantResponse,
  MessageResponse,
  ShareLinkResponse,
  SharedRootItemResponse,
} from '../../../shared/api/generated/openapi';
import {
  createGrant,
  createPublicLink,
  listGrants,
  listPublicLinks,
  listSharedWithMe,
  revokeGrant,
  revokePublicLink,
} from '../api/sharing-api';

export const sharingQueryKeys = {
  all: ['sharing'] as const,
  resource: (resourceId: string) => ['sharing', 'resource', resourceId] as const,
  sharedWithMe: (limit: number) => ['sharing', 'shared-with-me', { limit }] as const,
};

export interface UseSharedWithMeOptions {
  limit?: number;
}

export function useSharedWithMe({ limit = 50 }: UseSharedWithMeOptions = {}) {
  const query = useInfiniteQuery({
    queryKey: sharingQueryKeys.sharedWithMe(limit),
    queryFn: ({ pageParam, signal }) =>
      listSharedWithMe({ cursor: pageParam, limit, signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });

  // 后端已按共享根投影返回结果，这里保留每页及每个共享投影，不做客户端去重。
  const items = useMemo<SharedRootItemResponse[]>(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
  );

  return {
    ...query,
    items,
    loadMore: query.fetchNextPage,
  };
}

export interface UseSharingResult {
  createLink: () => Promise<ShareLinkResponse>;
  createMember: (input: GrantCreateRequest) => Promise<GrantResponse>;
  error: Error | null;
  isLoading: boolean;
  isPending: boolean;
  links: ShareLinkResponse[];
  members: GrantResponse[];
  revokeLink: (linkId: string) => Promise<MessageResponse>;
  revokeMember: (granteeUserId: string) => Promise<MessageResponse>;
}

export function useSharing(
  resourceId: string | null,
  enabled = true,
): UseSharingResult {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: sharingQueryKeys.resource(resourceId ?? ''),
    enabled: enabled && resourceId !== null && resourceId.length > 0,
    queryFn: async ({ signal }) => {
      if (resourceId === null) throw new Error('缺少资源 ID');
      const [grantResponse, linkResponse] = await Promise.all([
        listGrants(resourceId, { signal }),
        listPublicLinks(resourceId, { signal }),
      ]);
      return { links: linkResponse.items, members: grantResponse.items };
    },
  });

  const invalidateResource = useCallback(() => {
    if (resourceId === null) return;
    void queryClient.invalidateQueries({
      queryKey: sharingQueryKeys.resource(resourceId),
    });
  }, [queryClient, resourceId]);

  const memberMutation = useMutation({
    mutationFn: (input: GrantCreateRequest) => {
      if (resourceId === null) return Promise.reject(new Error('缺少资源 ID'));
      return createGrant(resourceId, input);
    },
    onSuccess: invalidateResource,
  });
  const revokeMemberMutation = useMutation({
    mutationFn: (granteeUserId: string) => {
      if (resourceId === null) return Promise.reject(new Error('缺少资源 ID'));
      return revokeGrant(resourceId, granteeUserId);
    },
    onSuccess: invalidateResource,
  });
  const linkMutation = useMutation({
    mutationFn: () => {
      if (resourceId === null) return Promise.reject(new Error('缺少资源 ID'));
      return createPublicLink(resourceId);
    },
    onSuccess: invalidateResource,
  });
  const revokeLinkMutation = useMutation({
    mutationFn: (linkId: string) => {
      if (resourceId === null) return Promise.reject(new Error('缺少资源 ID'));
      return revokePublicLink(resourceId, linkId);
    },
    onSuccess: invalidateResource,
  });

  const createMember = useCallback(
    (input: GrantCreateRequest) => memberMutation.mutateAsync(input),
    [memberMutation],
  );
  const revokeMember = useCallback(
    (granteeUserId: string) => revokeMemberMutation.mutateAsync(granteeUserId),
    [revokeMemberMutation],
  );
  const createLink = useCallback(() => linkMutation.mutateAsync(), [linkMutation]);
  const revokeLink = useCallback(
    (linkId: string) => revokeLinkMutation.mutateAsync(linkId),
    [revokeLinkMutation],
  );

  return {
    createLink,
    createMember,
    error: query.error instanceof Error ? query.error : null,
    isLoading: query.isLoading,
    isPending:
      memberMutation.isPending ||
      revokeMemberMutation.isPending ||
      linkMutation.isPending ||
      revokeLinkMutation.isPending,
    links: query.data?.links ?? [],
    members: query.data?.members ?? [],
    revokeLink,
    revokeMember,
  };
}
