import { useQuery } from '@tanstack/react-query';

import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import { getPreviewAccess } from '../api/preview-api';

export const DEFAULT_MAX_TEXT_BYTES = 5 * 1024 * 1024;

export interface PreviewResourceOptions {
  maxTextBytes?: number;
}

export class PreviewResourceError extends Error {
  readonly code: 'preview_too_large' | 'preview_decode_failed' | 'preview_fetch_failed';

  constructor(code: PreviewResourceError['code'], message: string) {
    super(message);
    this.name = 'PreviewResourceError';
    this.code = code;
  }
}

export interface PreviewResourceData {
  access: ContentAccessResponse;
  text: string | null;
}

export interface PreviewResourceResult {
  access: ContentAccessResponse | undefined;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  text: string | null;
}

function isTextPreview(access: ContentAccessResponse): boolean {
  return (
    access.previewable &&
    (access.detected_mime === 'text/plain' || access.detected_mime === 'text/markdown')
  );
}

async function readTextPreview(
  access: ContentAccessResponse,
  signal: AbortSignal,
  maxTextBytes: number,
): Promise<string> {
  const response = await fetch(access.url, { signal });
  if (!response.ok) {
    throw new PreviewResourceError('preview_fetch_failed', '文本预览加载失败');
  }

  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxTextBytes) {
    throw new PreviewResourceError('preview_too_large', '文本内容超过预览大小上限');
  }

  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > maxTextBytes) {
    throw new PreviewResourceError('preview_too_large', '文本内容超过预览大小上限');
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new PreviewResourceError('preview_decode_failed', '文本编码无法解析');
  }
}

async function fetchPreviewResource(
  resourceId: string,
  signal: AbortSignal,
  maxTextBytes: number,
): Promise<PreviewResourceData> {
  const access = await getPreviewAccess(resourceId, { signal });
  const text = isTextPreview(access)
    ? await readTextPreview(access, signal, maxTextBytes)
    : null;
  return { access, text };
}

export function usePreviewResource(
  resourceId: string | null,
  options: PreviewResourceOptions = {},
): PreviewResourceResult {
  const maxTextBytes = options.maxTextBytes ?? DEFAULT_MAX_TEXT_BYTES;
  const query = useQuery<PreviewResourceData, Error>({
    enabled: resourceId !== null && resourceId.length > 0,
    queryKey: ['preview-resource', resourceId, maxTextBytes],
    queryFn: ({ signal }) => {
      if (resourceId === null || resourceId.length === 0) {
        throw new Error('缺少预览资源');
      }
      return fetchPreviewResource(resourceId, signal, maxTextBytes);
    },
    staleTime: 30_000,
  });

  return {
    access: query.data?.access,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    text: query.data?.text ?? null,
  };
}
