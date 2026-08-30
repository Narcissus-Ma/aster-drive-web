import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ApiClientError } from '../../../shared/api/api-client';
import type { DocumentContentResponse } from '../../../shared/api/generated/openapi';
import {
  documentContentFingerprint,
  toDocumentContent,
  type DocumentContent,
  type DocumentSaveStatus,
} from '../models/document-content';

export type DocumentSaveHandler = (
  content: DocumentContent,
  revision: number,
  idempotencyKey: string,
) => Promise<DocumentContentResponse>;

export interface UseDocumentAutosaveOptions {
  content: DocumentContent | null;
  debounceMs?: number;
  enabled?: boolean;
  maxRetries?: number;
  onConflict?: (error: unknown) => void;
  resourceKey?: string;
  revision: number | null;
  save: DocumentSaveHandler;
}

export interface UseDocumentAutosaveResult {
  clearConflict: () => void;
  error: unknown;
  flush: () => Promise<void>;
  hasUnsavedChanges: boolean;
  reset: (content: DocumentContent, revision: number) => void;
  status: DocumentSaveStatus;
}

function createIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `document-save-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function isRevisionConflict(error: unknown): boolean {
  return (
    error instanceof ApiClientError &&
    (error.status === 409 || error.code === 'document_revision_conflict')
  );
}

export function useDocumentAutosave({
  content,
  debounceMs = 1000,
  enabled = true,
  maxRetries = 2,
  onConflict,
  resourceKey = 'document',
  revision,
  save,
}: UseDocumentAutosaveOptions): UseDocumentAutosaveResult {
  const [status, setStatus] = useState<DocumentSaveStatus>('idle');
  const [error, setError] = useState<unknown>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const queuedRef = useRef(false);
  const blockedRef = useRef(false);
  const mountedRef = useRef(true);
  const initializedRef = useRef(false);
  const observedFingerprintRef = useRef<string | null>(null);
  const resourceKeyRef = useRef(resourceKey);
  const latestContentRef = useRef<DocumentContent | null>(content);
  const latestRevisionRef = useRef<number | null>(revision);
  const lastSavedFingerprintRef = useRef<string | null>(null);
  const saveRef = useRef(save);
  const onConflictRef = useRef(onConflict);
  const runSaveRef = useRef<() => Promise<void>>(async () => undefined);
  const flushRef = useRef<() => Promise<void>>(async () => undefined);

  const contentFingerprint = useMemo(
    () => (content ? documentContentFingerprint(content) : null),
    [content],
  );

  useEffect(() => {
    saveRef.current = save;
    onConflictRef.current = onConflict;
  }, [onConflict, save]);

  const updateStatus = useCallback((nextStatus: DocumentSaveStatus) => {
    if (mountedRef.current) setStatus(nextStatus);
  }, []);

  const updateError = useCallback((nextError: unknown) => {
    if (mountedRef.current) setError(nextError);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runSave = useCallback(async (): Promise<void> => {
    clearTimer();
    if (!enabled || blockedRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      return inFlightRef.current;
    }

    const nextContent = latestContentRef.current;
    const nextRevision = latestRevisionRef.current;
    if (nextContent === null || nextRevision === null) return;

    const nextFingerprint = documentContentFingerprint(nextContent);
    if (nextFingerprint === lastSavedFingerprintRef.current) {
      updateStatus('saved');
      return;
    }

    updateStatus('saving');
    updateError(null);
    const idempotencyKey = createIdempotencyKey();
    const request = (async () => {
      let retryCount = 0;
      while (true) {
        try {
          const response = await saveRef.current(
            nextContent,
            nextRevision,
            idempotencyKey,
          );
          const savedContent = toDocumentContent(response.content);
          lastSavedFingerprintRef.current = documentContentFingerprint(savedContent);
          latestRevisionRef.current = response.revision;
          updateError(null);
          const currentContent = latestContentRef.current;
          const currentFingerprint = currentContent
            ? documentContentFingerprint(currentContent)
            : null;
          updateStatus(
            currentFingerprint === lastSavedFingerprintRef.current ? 'saved' : 'dirty',
          );
          return;
        } catch (saveError) {
          if (isRevisionConflict(saveError)) {
            blockedRef.current = true;
            updateError(saveError);
            updateStatus('conflict');
            onConflictRef.current?.(saveError);
            return;
          }
          if (retryCount >= maxRetries) {
            updateError(saveError);
            updateStatus('error');
            return;
          }
          retryCount += 1;
          await Promise.resolve();
        }
      }
    })();
    inFlightRef.current = request;

    try {
      await request;
    } finally {
      if (inFlightRef.current === request) inFlightRef.current = null;
      if (queuedRef.current && !blockedRef.current) {
        queuedRef.current = false;
        if (mountedRef.current) {
          void runSave();
        }
      }
    }
  }, [clearTimer, enabled, maxRetries, updateError, updateStatus]);

  runSaveRef.current = runSave;

  const scheduleSave = useCallback(() => {
    clearTimer();
    if (!enabled || blockedRef.current || latestContentRef.current === null) return;
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void runSaveRef.current();
    }, debounceMs);
  }, [clearTimer, debounceMs, enabled]);

  const flush = useCallback(async (): Promise<void> => {
    clearTimer();
    if (!enabled || blockedRef.current) return;
    if (inFlightRef.current) {
      queuedRef.current = true;
      await inFlightRef.current;
      return;
    }
    await runSave();
  }, [clearTimer, enabled, runSave]);

  flushRef.current = flush;

  useLayoutEffect(() => {
    if (resourceKeyRef.current !== resourceKey) {
      resourceKeyRef.current = resourceKey;
      initializedRef.current = false;
      blockedRef.current = false;
      queuedRef.current = false;
      lastSavedFingerprintRef.current = null;
      observedFingerprintRef.current = null;
      clearTimer();
      updateError(null);
      updateStatus('idle');
    }

    latestContentRef.current = content;
    latestRevisionRef.current = revision;
    const contentChanged = observedFingerprintRef.current !== contentFingerprint;
    observedFingerprintRef.current = contentFingerprint;
    if (!enabled || content === null || revision === null) {
      clearTimer();
      return;
    }

    if (!initializedRef.current || lastSavedFingerprintRef.current === null) {
      initializedRef.current = true;
      lastSavedFingerprintRef.current = contentFingerprint;
      blockedRef.current = false;
      updateError(null);
      updateStatus('idle');
      return;
    }

    if (!contentChanged) return;

    if (contentFingerprint === lastSavedFingerprintRef.current) {
      if (!inFlightRef.current && !blockedRef.current) updateStatus('saved');
      return;
    }

    if (blockedRef.current) return;
    updateStatus('dirty');
    if (inFlightRef.current) {
      queuedRef.current = true;
      return;
    }
    scheduleSave();
  }, [
    clearTimer,
    content,
    contentFingerprint,
    enabled,
    revision,
    resourceKey,
    scheduleSave,
    updateError,
    updateStatus,
  ]);

  useEffect(() => {
    mountedRef.current = true;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const currentContent = latestContentRef.current;
      const currentFingerprint = currentContent
        ? documentContentFingerprint(currentContent)
        : null;
      if (
        !inFlightRef.current &&
        lastSavedFingerprintRef.current === currentFingerprint
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = '文档尚未保存';
      void flushRef.current();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      mountedRef.current = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      clearTimer();
      void flushRef.current();
    };
  }, [clearTimer]);

  const clearConflict = useCallback(() => {
    blockedRef.current = false;
    updateError(null);
    const currentContent = latestContentRef.current;
    if (currentContent === null) {
      updateStatus('idle');
      return;
    }
    const currentFingerprint = documentContentFingerprint(currentContent);
    if (currentFingerprint === lastSavedFingerprintRef.current) {
      updateStatus('saved');
      return;
    }
    updateStatus('dirty');
    scheduleSave();
  }, [scheduleSave, updateError, updateStatus]);

  const reset = useCallback(
    (nextContent: DocumentContent, nextRevision: number) => {
      clearTimer();
      latestContentRef.current = nextContent;
      latestRevisionRef.current = nextRevision;
      const nextFingerprint = documentContentFingerprint(nextContent);
      lastSavedFingerprintRef.current = nextFingerprint;
      observedFingerprintRef.current = nextFingerprint;
      initializedRef.current = true;
      blockedRef.current = false;
      queuedRef.current = false;
      updateError(null);
      updateStatus('idle');
    },
    [clearTimer, updateError, updateStatus],
  );

  const hasUnsavedChanges =
    latestContentRef.current !== null &&
    documentContentFingerprint(latestContentRef.current) !==
      lastSavedFingerprintRef.current;

  return { clearConflict, error, flush, hasUnsavedChanges, reset, status };
}
