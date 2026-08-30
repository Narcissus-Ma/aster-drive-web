import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';

import type {
  PublicContentResponse,
  PublicDocumentResponse,
} from '../../../shared/api/generated/openapi';
import { usePublicShare } from '../hooks/use-public-share';
import styles from './public-share-page.module.css';

type DocumentNode = Record<string, unknown>;

function isDocumentNode(value: unknown): value is DocumentNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function documentChildren(node: DocumentNode): DocumentNode[] {
  const content = node.content;
  if (!Array.isArray(content)) return [];
  return content.filter(isDocumentNode);
}

function renderDocumentNode(node: DocumentNode, key: string): JSX.Element {
  const type = typeof node.type === 'string' ? node.type : 'paragraph';
  if (type === 'text') {
    return <span key={key}>{typeof node.text === 'string' ? node.text : ''}</span>;
  }

  const children = documentChildren(node).map((child, index) =>
    renderDocumentNode(child, `${key}-${index}`),
  );
  if (type === 'heading') {
    const level =
      typeof node.attrs === 'object' && node.attrs !== null
        ? Number((node.attrs as Record<string, unknown>).level)
        : 2;
    if (level === 1) return <h2 key={key}>{children}</h2>;
    if (level === 3) return <h4 key={key}>{children}</h4>;
    return <h3 key={key}>{children}</h3>;
  }
  if (type === 'bulletList') return <ul key={key}>{children}</ul>;
  if (type === 'orderedList') return <ol key={key}>{children}</ol>;
  if (type === 'listItem') return <li key={key}>{children}</li>;
  if (type === 'blockquote') return <blockquote key={key}>{children}</blockquote>;
  if (type === 'codeBlock')
    return (
      <pre key={key}>
        <code>{children}</code>
      </pre>
    );
  return <p key={key}>{children}</p>;
}

function renderDocument(document: PublicDocumentResponse): JSX.Element {
  const root = document.content;
  const nodes = documentChildren(root);
  if (nodes.length === 0) return <p>文档暂无内容</p>;
  return <>{nodes.map((node, index) => renderDocumentNode(node, String(index)))}</>;
}

function renderContentAccess(access: PublicContentResponse): JSX.Element {
  if (!access.previewable || access.disposition !== 'inline') {
    return <p className={styles.feedback}>该文件暂不支持在线预览，请下载查看。</p>;
  }
  if (access.detected_mime.startsWith('image/')) {
    return (
      <img
        className={styles.image}
        src={access.url}
        alt={access.filename}
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  if (access.detected_mime === 'application/pdf') {
    return (
      <iframe
        className={styles.pdf}
        title={access.filename}
        src={access.url}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <p className={styles.feedback}>浏览器可直接打开此文件，或使用下方下载链接保存。</p>
  );
}

export function PublicSharePage(): JSX.Element {
  const { token } = useParams<{ token: string }>();
  const query = usePublicShare(token);
  const share = query.data;
  const title = share?.resource.name ?? '公开资源';
  const documentContent = useMemo(
    () => (share?.document ? renderDocument(share.document) : null),
    [share?.document],
  );

  if (query.isLoading) {
    return (
      <main className={styles.page}>
        <p className={styles.feedback} role="status" aria-live="polite">
          正在加载公开内容…
        </p>
      </main>
    );
  }
  if (query.isError || !share) {
    return (
      <main className={styles.page}>
        <section className={styles.card} role="alert" aria-live="assertive">
          <p className={styles.eyebrow}>ASTER DRIVE</p>
          <h1 className={styles.title}>公开链接无效或已失效</h1>
          <p className={styles.feedback}>
            请检查链接是否完整，或联系分享者重新生成链接。
          </p>
          <Link to="/login">登录 ASTER DRIVE</Link>
        </section>
      </main>
    );
  }

  const preview = share.preview;
  const download = share.download ?? preview;
  return (
    <main className={styles.page} aria-labelledby="public-share-title">
      <article className={styles.card}>
        <p className={styles.eyebrow}>ASTER DRIVE · 只读公开内容</p>
        <h1 id="public-share-title" className={styles.title}>
          {title}
        </h1>
        <div className={styles.meta}>
          <span>{share.kind === 'document' ? '文档' : '文件'}</span>
          <span>只读</span>
        </div>
        {share.document ? (
          <section className={styles.document} aria-label="公开文档内容">
            {documentContent}
          </section>
        ) : preview ? (
          <section className={styles.contentAccess} aria-label="公开文件预览">
            {renderContentAccess(preview)}
          </section>
        ) : (
          <p className={styles.feedback}>该公开资源暂无可用预览。</p>
        )}
        {download?.url ? (
          <div className={styles.actions}>
            <a
              download={download.filename}
              href={download.url}
              rel="noreferrer"
              target="_blank"
            >
              下载文件
            </a>
          </div>
        ) : null}
      </article>
    </main>
  );
}
