import { memo, useCallback } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import styles from './file-grid.module.css';

export interface FileGridProps {
  items: ResourceResponse[];
  onCopy?: (resource: ResourceResponse) => void;
  onOpen: (resource: ResourceResponse) => void;
  onShare?: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  selectedIds: Set<string>;
}

interface FileGridItemProps {
  onCopy?: (resource: ResourceResponse) => void;
  onOpen: (resource: ResourceResponse) => void;
  onShare?: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  resource: ResourceResponse;
  selected: boolean;
}

const FileGridItem = memo(function FileGridItem({
  onCopy,
  onOpen,
  onShare,
  onToggle,
  resource,
  selected,
}: FileGridItemProps): JSX.Element {
  const handleToggle = useCallback(
    () => onToggle(resource.id),
    [onToggle, resource.id],
  );
  const handleOpen = useCallback(() => onOpen(resource), [onOpen, resource]);

  return (
    <li className={styles.card} data-testid={`resource-card-${resource.id}`}>
      <div className={styles.cardBody}>
        <input
          type="checkbox"
          aria-label={`选择 ${resource.name}`}
          checked={selected}
          onChange={handleToggle}
        />
        <button className={styles.nameButton} type="button" onClick={handleOpen}>
          <span aria-hidden="true">{resource.kind === 'folder' ? '📁' : '📄'}</span>
          <span>{resource.name}</span>
        </button>
        {onShare || onCopy ? (
          <div className={styles.actions}>
            {onShare && resource.capabilities?.can_share === true ? (
              <button
                className={styles.actionButton}
                type="button"
                onClick={() => onShare(resource)}
              >
                共享
              </button>
            ) : null}
            {onCopy && resource.capabilities?.can_download === true ? (
              <button
                className={styles.actionButton}
                type="button"
                onClick={() => onCopy(resource)}
              >
                复制到
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </li>
  );
});

export function FileGrid({
  items,
  onCopy,
  onOpen,
  onShare,
  onToggle,
  selectedIds,
}: FileGridProps): JSX.Element {
  return (
    <ul className={styles.grid} data-testid="file-grid" aria-label="文件宫格">
      {items.map((item) => (
        <FileGridItem
          key={item.id}
          onCopy={onCopy}
          onOpen={onOpen}
          onShare={onShare}
          onToggle={onToggle}
          resource={item}
          selected={selectedIds.has(item.id)}
        />
      ))}
    </ul>
  );
}
