import { useCallback, useState, type CSSProperties } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';

export interface ResourceRowProps {
  favorite?: boolean;
  onFavoriteToggle?: (resourceId: string, isFavorite: boolean) => void;
  onOpen: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  resource: ResourceResponse;
  selected: boolean;
  style?: CSSProperties;
}

function capability(
  resource: ResourceResponse,
  key: keyof NonNullable<ResourceResponse['capabilities']>,
): boolean {
  return resource.capabilities?.[key] === true;
}

export function ResourceRow({
  favorite = false,
  onFavoriteToggle,
  onOpen,
  onToggle,
  resource,
  selected,
  style,
}: ResourceRowProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
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

  return (
    <li
      data-testid={`resource-row-${resource.id}`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      aria-selected={selected}
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
        <span>{resource.name}</span>
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
        {new Date(resource.updated_at).toLocaleDateString('zh-CN')}
      </time>
      <button
        type="button"
        aria-label="文件操作"
        aria-expanded={menuOpen}
        onClick={toggleMenu}
      >
        ⋯
      </button>
      {menuOpen ? (
        <div role="menu" aria-label={`${resource.name} 操作`}>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_rename')}
          >
            重命名
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_move')}
          >
            移动到
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_trash')}
          >
            移入回收站
          </button>
          <button
            role="menuitem"
            type="button"
            aria-disabled={!capability(resource, 'can_download')}
          >
            下载
          </button>
        </div>
      ) : null}
    </li>
  );
}
