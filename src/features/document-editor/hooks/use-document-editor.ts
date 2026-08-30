import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

import { ApiClientError } from '../../../shared/api/api-client';
import type { DocumentContentResponse } from '../../../shared/api/generated/openapi';
import { getDocumentContent, saveDocumentContent } from '../api/document-api';
import {
  canEditDocument,
  documentContentFingerprint,
  documentCapabilities,
  toDocumentContent,
  type DocumentContent,
} from '../models/document-content';

export const documentQueryKeys = {
  all: ['documents'] as const,
  content: (resourceId: string) => ['documents', 'content', resourceId] as const,
};

export interface UseDocumentEditorResult {
  canEdit: boolean;
  capabilities: NonNullable<DocumentContentResponse['capabilities']>;
  clearConflict: () => void;
  conflict: ApiClientError | null;
  content: DocumentContent | null;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  reload: () => Promise<DocumentContentResponse | undefined>;
  revision: number | null;
  save: (
    content: DocumentContent,
    revision: number,
    idempotencyKey: string,
  ) => Promise<DocumentContentResponse>;
  setConflict: (error: unknown) => void;
  updateContent: (content: DocumentContent) => void;
}

function normalizeConflict(error: unknown): ApiClientError {
  if (error instanceof ApiClientError) return error;
  if (error instanceof Error) {
    return new ApiClientError(error.message, { status: 0 });
  }
  return new ApiClientError('文档版本冲突', { status: 409 });
}

export function useDocumentEditor(resourceId: string | null): UseDocumentEditorResult {
  const queryClient = useQueryClient();
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [conflict, setConflictState] = useState<ApiClientError | null>(null);
  const query = useQuery<DocumentContentResponse, Error>({
    enabled: resourceId !== null && resourceId.length > 0,
    queryKey:
      resourceId === null
        ? [...documentQueryKeys.all, 'empty']
        : documentQueryKeys.content(resourceId),
    queryFn: ({ signal }) => {
      if (resourceId === null || resourceId.length === 0) {
        throw new Error('缺少文档资源');
      }
      return getDocumentContent(resourceId, { signal });
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!query.data) return;
    setContent(toDocumentContent(query.data.content));
    setRevision(query.data.revision);
    setConflictState(null);
  }, [query.data]);

  useEffect(() => {
    setContent(null);
    setRevision(null);
    setConflictState(null);
  }, [resourceId]);

  const updateContent = useCallback((nextContent: DocumentContent) => {
    setContent(nextContent);
  }, []);

  const save = useCallback(
    async (
      nextContent: DocumentContent,
      expectedRevision: number,
      idempotencyKey: string,
    ): Promise<DocumentContentResponse> => {
      if (resourceId === null || resourceId.length === 0) {
        throw new Error('缺少文档资源');
      }
      const result = await saveDocumentContent(
        resourceId,
        { content: nextContent, revision: expectedRevision },
        { idempotencyKey },
      );
      const savedContent = toDocumentContent(result.content);
      setContent((currentContent) => {
        if (
          currentContent === null ||
          documentContentFingerprint(currentContent) ===
            documentContentFingerprint(nextContent)
        ) {
          return savedContent;
        }
        return currentContent;
      });
      setRevision(result.revision);
      setConflictState(null);
      queryClient.setQueryData(documentQueryKeys.content(resourceId), result);
      return result;
    },
    [queryClient, resourceId],
  );

  const reload = useCallback(async (): Promise<DocumentContentResponse | undefined> => {
    const result = await query.refetch();
    if (result.data) {
      setContent(toDocumentContent(result.data.content));
      setRevision(result.data.revision);
      setConflictState(null);
    }
    return result.data;
  }, [query]);

  const setConflict = useCallback((error: unknown) => {
    setConflictState(normalizeConflict(error));
  }, []);

  const clearConflict = useCallback(() => {
    setConflictState(null);
  }, []);

  return {
    canEdit: canEditDocument(query.data),
    capabilities: documentCapabilities(query.data),
    clearConflict,
    conflict,
    content,
    error: query.error,
    isError: query.isError,
    isLoading: query.isLoading,
    reload,
    revision,
    save,
    setConflict,
    updateContent,
  };
}
