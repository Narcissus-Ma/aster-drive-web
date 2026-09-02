import { useQuery } from '@tanstack/react-query';

import { resolveRootResource } from '../api/resource-api';

export const rootResourceQueryKey = ['resources', 'root'] as const;

export interface UseRootResourceOptions {
  enabled?: boolean;
}

export function useRootResource({ enabled = true }: UseRootResourceOptions = {}) {
  return useQuery({
    queryKey: rootResourceQueryKey,
    queryFn: ({ signal }) => resolveRootResource({ signal }),
    enabled,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
