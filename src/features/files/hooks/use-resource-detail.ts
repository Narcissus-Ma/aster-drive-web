import { useQuery } from '@tanstack/react-query';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { getResourceDetail } from '../api/resource-api';
import { resourceQueryKeys } from './use-folder-children';

export function useResourceDetail(resourceId: string | undefined) {
  return useQuery<ResourceResponse, Error>({
    enabled: Boolean(resourceId),
    queryKey: resourceQueryKeys.detail(resourceId ?? ''),
    queryFn: () => {
      if (!resourceId) throw new Error('缺少资源 ID');
      return getResourceDetail(resourceId);
    },
    retry: false,
    staleTime: 30_000,
  });
}
