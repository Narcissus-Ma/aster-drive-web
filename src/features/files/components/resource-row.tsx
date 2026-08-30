import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';

export interface ResourceRowProps {
  favorite?: boolean;
  metaLabel?: string;
  onCopy?: (resource: ResourceResponse) => void;
  onFavoriteToggle?: (resourceId: string, isFavorite: boolean) => void;
  onOpen: (resource: ResourceResponse) => void;
  onShare?: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  resource: ResourceResponse;
  selected: boolean;
  positionInSet?: number;
  setSize?: number;
  style?: CSSProperties;
}

const dateFormatter = new Intl.DateTimeFormat('zh-CN');

function capability(
  resource: ResourceResponse,
  key: keyof NonNullable<ResourceResponse['capabilities']>,
): boolean {
  return resource.capabilities?.[key] === true;
}

export function ResourceRow({
  favorite = false,
  metaLabel,
  onCopy,
  onFavoriteToggle,
  onOpen,
  onShare,
  onToggle,
  resource,
  selected,
  positionInSet,
  setSize,
  style,
}: ResourceRowProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const handleOpen = useCallback(() => onOpen(resource), [onOpen, resource]);
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleOpen();
      }
    },
    [handleOpen],
  );
  const handleToggle = useCallback(
    () => onToggle(resource.id),
    [onToggle, resource.id],
  );
  const handleFavoriteToggle = useCallback(
    () => onFavoriteToggle?.(resource.id, !favorite),
    [favorite, onFavoriteToggle, resource.id],
  );
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);
  useEffect(() => {
    if (!menuOpen) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  }, [menuOpen]);

  const handleMenuKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    },
    [],
  );
  const handleShare = useCallback(() => {
    setMenuOpen(false);
    onShare?.(resource);
  }, [onShare, resource]);
  const handleCopy = useCallback(() => {
    setMenuOpen(false);
    onCopy?.(resource);
  }, [onCopy, resource]);

  return (
    <li
      data-testid={`resource-row-${resource.id}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-selected={selected}
      aria-setsize={setSize}
      aria-posinset={positionInSet}
      style={style}
    >
      <input
        type="checkbox"
        aria-label={`选择 ${resource.name}`}
        checked={selected}
        onChange={handleToggle}
      />
      <button type="button" onClick={handleOpen}>
        <span aria-hidden="true">{resource.kind === 'folder' ? '📁' : '📄'}</span>
        <span title={resource.name}>{resource.name}</span>
      </button>
      {onFavoriteToggle ? (
        <button
          type="button"
          aria-label={`${favorite ? '取消收藏' : '收藏'} ${resource.name}`}
          aria-pressed={favorite}
          onClick={handleFavoriteToggle}
        >
          {favorite ? '★' : '☆'}
        </button>
      ) : null}
      <time dateTime={resource.updated_at}>
        {dateFormatter.format(new Date(resource.updated_at))}
      </time>
      {metaLabel ? <span aria-label="资源权限">{metaLabel}</span> : null}
      <button
        type="button"
        aria-label="文件操作"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        ref={menuButtonRef}
        onClick={toggleMenu}
      >
        ⋯
      </button>
      {menuOpen ? (
        <div
          ref={menuRef}
          role="menu"
          aria-label={`${resource.name} 操作`}
          onKeyDown={handleMenuKeyDown}
        >
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_rename')}
            disabled={!capability(resource, 'can_rename')}
          >
            重命名
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_move')}
            disabled={!capability(resource, 'can_move')}
          >
            移动到
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_trash')}
            disabled={!capability(resource, 'can_trash')}
          >
            移入回收站
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_download')}
            disabled={!capability(resource, 'can_download')}
          >
            下载
          </button>
          {onCopy && capability(resource, 'can_download') ? (
            <button role="menuitem" type="button" onClick={handleCopy}>
              复制到
            </button>
          ) : null}
          {capability(resource, 'can_share') ? (
            <button role="menuitem" type="button" onClick={handleShare}>
              共享
            </button>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
