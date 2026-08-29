import { memo, useCallback } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';

export interface FileGridProps {
  items: ResourceResponse[];
  onOpen: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  selectedIds: Set<string>;
}

interface FileGridItemProps {
  onOpen: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  resource: ResourceResponse;
  selected: boolean;
}

const FileGridItem = memo(function FileGridItem({
  onOpen,
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
    <li data-testid={`resource-card-${resource.id}`}>
      <label>
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
      </label>
    </li>
  );
});

export function FileGrid({
  items,
  onOpen,
  onToggle,
  selectedIds,
}: FileGridProps): JSX.Element {
  return (
    <ul data-testid="file-grid" aria-label="文件宫格">
      {items.map((item) => (
        <FileGridItem
          key={item.id}
          onOpen={onOpen}
          onToggle={onToggle}
          resource={item}
          selected={selectedIds.has(item.id)}
        />
      ))}
    </ul>
  );
}
