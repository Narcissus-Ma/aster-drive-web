import { lazy, Suspense, useEffect, useRef } from 'react';

import type {
  ContentAccessResponse,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { usePreviewResource } from '../hooks/use-preview-resource';
import styles from './preview-drawer.module.css';
import { UnsupportedPreview } from './unsupported-preview';

const ImagePreview = lazy(() =>
  import('./image-preview').then(({ ImagePreview: component }) => ({
    default: component,
  })),
);
const PdfPreview = lazy(() =>
  import('./pdf-preview').then(({ PdfPreview: component }) => ({ default: component })),
);
const TextPreview = lazy(() =>
  import('./text-preview').then(({ TextPreview: component }) => ({
    default: component,
  })),
);

export interface PreviewDrawerProps {
  onClose: () => void;
  open: boolean;
  resource: ResourceResponse | null;
}

const inlineImageTypes = new Set([
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

function renderPreview(
  access: ContentAccessResponse,
  text: string | null,
): JSX.Element {
  if (!access.previewable || access.disposition !== 'inline') {
    return <UnsupportedPreview access={access} />;
  }
  if (inlineImageTypes.has(access.detected_mime)) {
    return (
      <Suspense fallback={<p className={styles.feedback}>正在加载预览组件…</p>}>
        <ImagePreview access={access} />
      </Suspense>
    );
  }
  if (access.detected_mime === 'application/pdf') {
    return (
      <Suspense fallback={<p className={styles.feedback}>正在加载预览组件…</p>}>
        <PdfPreview access={access} />
      </Suspense>
    );
  }
  if (
    (access.detected_mime === 'text/plain' ||
      access.detected_mime === 'text/markdown') &&
    text !== null
  ) {
    return (
      <Suspense fallback={<p className={styles.feedback}>正在加载预览组件…</p>}>
        <TextPreview access={access} text={text} />
      </Suspense>
    );
  }
  return <UnsupportedPreview access={access} />;
}

export function PreviewDrawer({
  onClose,
  open,
  resource,
}: PreviewDrawerProps): JSX.Element | null {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const resourceId = open ? (resource?.id ?? null) : null;
  const previewQuery = usePreviewResource(resourceId);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open || resourceId === null) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    };
  }, [open, resourceId]);

  if (!open || resource === null) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div
      aria-labelledby="preview-drawer-title"
      aria-modal="true"
      className={styles.backdrop}
      data-testid="preview-drawer"
      onMouseDown={handleBackdropClick}
      role="dialog"
    >
      <section className={styles.drawer}>
        <header className={styles.header}>
          <h2 id="preview-drawer-title">{resource.name}</h2>
          <button
            ref={closeButtonRef}
            className={styles.closeButton}
            type="button"
            onClick={onClose}
          >
            关闭预览
          </button>
        </header>
        <div className={styles.body}>
          {previewQuery.isLoading ? (
            <p className={styles.feedback} role="status">
              正在加载预览…
            </p>
          ) : null}
          {previewQuery.isError ? (
            <UnsupportedPreview
              message={
                previewQuery.error instanceof Error
                  ? previewQuery.error.message
                  : '预览加载失败，请稍后重试'
              }
            />
          ) : null}
          {!previewQuery.isLoading && !previewQuery.isError && previewQuery.access
            ? renderPreview(previewQuery.access, previewQuery.text)
            : null}
        </div>
      </section>
    </div>
  );
}
