import { useQuery } from '@tanstack/react-query';

import { getPublicShare } from '../../sharing/api/sharing-api';

export const publicShareQueryKeys = {
  all: ['public-share'] as const,
  token: (token: string) => ['public-share', token] as const,
};

export function usePublicShare(token: string | undefined) {
  return useQuery({
    queryKey: publicShareQueryKeys.token(token ?? ''),
    enabled: Boolean(token),
    queryFn: ({ signal }) => {
      if (!token) throw new Error('公开链接无效');
      return getPublicShare(token, { signal });
    },
  });
}
