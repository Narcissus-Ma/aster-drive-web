import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { ResourceRow } from './resource-row';

export interface FileListProps {
  items: ResourceResponse[];
  onOpen: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  selectedIds: Set<string>;
}

export function FileList({
  items,
  onOpen,
  onToggle,
  selectedIds,
}: FileListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });
  const visibleItems = useMemo(
    () =>
      shouldVirtualize
        ? rowVirtualizer.getVirtualItems().map((item) => items[item.index])
        : items,
    [items, rowVirtualizer, shouldVirtualize],
  );

  return (
    <div
      ref={parentRef}
      data-testid="file-list-scroll"
      style={{ maxHeight: 'min(62vh, 640px)', overflow: 'auto' }}
    >
      <ul
        data-testid="file-list"
        aria-label="文件列表"
        style={
          shouldVirtualize
            ? {
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }
            : undefined
        }
      >
        {visibleItems.map((item) => {
          const virtualItem = shouldVirtualize
            ? rowVirtualizer
                .getVirtualItems()
                .find((entry) => items[entry.index]?.id === item.id)
            : undefined;
          return (
            <ResourceRow
              key={item.id}
              onOpen={onOpen}
              onToggle={onToggle}
              resource={item}
              selected={selectedIds.has(item.id)}
              style={
                virtualItem
                  ? {
                      position: 'absolute',
                      top: 0,
                      width: '100%',
                      transform: `translateY(${virtualItem.start}px)`,
                    }
                  : undefined
              }
            />
          );
        })}
      </ul>
    </div>
  );
}
