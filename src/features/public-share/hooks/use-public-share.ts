import { useQuery } from '@tanstack/react-query';

import { getPublicShare } from '../../sharing/api/sharing-api';

export const DEFAULT_PUBLIC_SHARE_TIMEOUT_MS = 10_000;

export interface PublicShareOptions {
  timeoutMs?: number;
}

export class PublicShareTimeoutError extends Error {
  constructor() {
    super('公开内容加载超时，请检查网络后重试');
    this.name = 'PublicShareTimeoutError';
  }
}

export const publicShareQueryKeys = {
  all: ['public-share'] as const,
  token: (token: string) => ['public-share', token] as const,
};

async function fetchPublicShare(token: string, signal: AbortSignal, timeoutMs: number) {
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId = globalThis.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const abortFromQuery = () => controller.abort();

  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener('abort', abortFromQuery, { once: true });
  }

  try {
    return await getPublicShare(token, { signal: controller.signal });
  } catch (error) {
    if (timedOut) throw new PublicShareTimeoutError();
    throw error;
  } finally {
    globalThis.clearTimeout(timeoutId);
    signal.removeEventListener('abort', abortFromQuery);
  }
}

export function usePublicShare(
  token: string | undefined,
  options: PublicShareOptions = {},
) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PUBLIC_SHARE_TIMEOUT_MS;
  return useQuery({
    queryKey: publicShareQueryKeys.token(token ?? ''),
    enabled: Boolean(token),
    retry: false,
    queryFn: ({ signal }) => {
      if (!token) throw new Error('公开链接无效');
      return fetchPublicShare(token, signal, timeoutMs);
    },
  });
}
