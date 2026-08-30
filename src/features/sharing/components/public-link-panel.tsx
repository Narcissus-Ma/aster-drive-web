import { useCallback, useMemo, useState } from 'react';

import type { ShareLinkResponse } from '../../../shared/api/generated/openapi';
import styles from './sharing-dialog.module.css';

export interface PublicLinkPanelProps {
  canShare: boolean;
  links: ShareLinkResponse[];
  onCreate?: () => Promise<ShareLinkResponse>;
  onRevoke?: (linkId: string) => void;
}

function linkUrl(link: ShareLinkResponse): string {
  if (link.token) {
    const apiUrl = link.url
      ? new URL(
          link.url,
          typeof window === 'undefined' ? 'http://localhost' : window.location.origin,
        )
      : null;
    if (!apiUrl || apiUrl.pathname.startsWith('/api/v1/public/share/')) {
      if (typeof window !== 'undefined') {
        return `${window.location.origin}/public/share/${encodeURIComponent(link.token)}`;
      }
      return `/public/share/${encodeURIComponent(link.token)}`;
    }
  }
  if (link.url) return link.url;
  return link.token ?? '';
}

export function PublicLinkPanel({
  canShare,
  links,
  onCreate,
  onRevoke,
}: PublicLinkPanelProps): JSX.Element {
  const [createdLink, setCreatedLink] = useState<ShareLinkResponse | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const activeLink = useMemo(
    () => createdLink ?? links.find((link) => !link.revoked_at && link.token),
    [createdLink, links],
  );
  const activeUrl = activeLink ? linkUrl(activeLink) : '';

  const handleCreate = useCallback(async () => {
    if (!onCreate) return;
    setIsCreating(true);
    try {
      setCreatedLink(await onCreate());
      setCopyState('idle');
    } finally {
      setIsCreating(false);
    }
  }, [onCreate]);

  const handleCopy = useCallback(async () => {
    if (!activeUrl) return;
    try {
      if (!navigator.clipboard) throw new Error('当前环境不支持剪贴板');
      await navigator.clipboard.writeText(activeUrl);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  }, [activeUrl]);

  const handleRevoke = useCallback(() => {
    if (!activeLink) return;
    setCreatedLink(null);
    onRevoke?.(activeLink.id);
  }, [activeLink, onRevoke]);

  return (
    <section aria-labelledby="share-public-link-title">
      <h3 id="share-public-link-title">公开链接</h3>
      {!activeLink ? <p className={styles.muted}>尚未生成公开链接</p> : null}
      {activeLink && activeUrl ? (
        <div className={styles.publicLinkRow}>
          <input aria-label="公开链接地址" readOnly value={activeUrl} />
          <button type="button" onClick={() => void handleCopy()}>
            复制公开链接
          </button>
          {canShare ? (
            <button type="button" onClick={handleRevoke}>
              撤销公开链接
            </button>
          ) : null}
          {copyState === 'copied' ? <span role="status">已复制</span> : null}
          {copyState === 'failed' ? (
            <span role="alert">复制失败，请手动复制</span>
          ) : null}
        </div>
      ) : null}
      {canShare ? (
        <button type="button" disabled={isCreating} onClick={() => void handleCreate()}>
          {isCreating ? '正在生成…' : '生成公开链接'}
        </button>
      ) : null}
    </section>
  );
}
