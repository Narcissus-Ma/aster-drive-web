import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import { ResourceRow } from './resource-row';
import styles from './file-list.module.css';

export interface FileListProps {
  items: ResourceResponse[];
  onCopy?: (resource: ResourceResponse) => void;
  onDownload?: (resource: ResourceResponse) => void;
  onMove?: (resource: ResourceResponse) => void;
  onOpen: (resource: ResourceResponse) => void;
  onRename?: (resource: ResourceResponse) => void;
  onShare?: (resource: ResourceResponse) => void;
  onTrash?: (resource: ResourceResponse) => void;
  onToggle: (resourceId: string) => void;
  selectedIds: Set<string>;
}

export function FileList({
  items,
  onCopy,
  onDownload,
  onMove,
  onOpen,
  onRename,
  onShare,
  onToggle,
  onTrash,
  selectedIds,
}: FileListProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const shouldVirtualize = items.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualize ? items.length : 0,
    getScrollElement: () => parentRef.current,
    getItemKey: (index) => items[index]?.id ?? index,
    estimateSize: () => 56,
    overscan: 8,
  });
  const virtualItems = shouldVirtualize ? rowVirtualizer.getVirtualItems() : [];
  const visibleItems = shouldVirtualize
    ? virtualItems.length > 0
      ? virtualItems
          .map((item) => items[item.index])
          .filter((item): item is ResourceResponse => item !== undefined)
      : items.slice(0, 20)
    : items;

  return (
    <div ref={parentRef} className={styles.listScroll} data-testid="file-list-scroll">
      <ul
        className={styles.list}
        data-testid="file-list"
        aria-label="文件列表"
        style={
          shouldVirtualize
            ? {
                contain: 'layout paint style',
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
              }
            : undefined
        }
      >
        {visibleItems.map((item) => {
          const virtualItem = shouldVirtualize
            ? virtualItems.find((entry) => items[entry.index]?.id === item.id)
            : undefined;
          return (
            <ResourceRow
              key={item.id}
              onCopy={onCopy}
              onDownload={onDownload}
              onMove={onMove}
              onOpen={onOpen}
              onRename={onRename}
              onShare={onShare}
              onToggle={onToggle}
              onTrash={onTrash}
              resource={item}
              selected={selectedIds.has(item.id)}
              positionInSet={
                shouldVirtualize
                  ? items.findIndex((entry) => entry.id === item.id) + 1
                  : items.indexOf(item) + 1
              }
              setSize={items.length}
              style={
                virtualItem
                  ? {
                      contain: 'layout paint style',
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
