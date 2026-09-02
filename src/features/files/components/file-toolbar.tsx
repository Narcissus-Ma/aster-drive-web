import { useCallback, useState } from 'react';

import type { ResourceResponse } from '../../../shared/api/generated/openapi';
import type { FileViewMode } from '../store/file-view-state';
import styles from './file-toolbar.module.css';

export interface FileToolbarProps {
  onClearSelection: () => void;
  onCreateFolder: () => void;
  createFolderDisabled?: boolean;
  onDownload?: () => void;
  onRefresh: () => void;
  onMove?: () => void;
  onRename?: () => void;
  onTrash?: () => void;
  onViewModeChange: (mode: FileViewMode) => void;
  selectedCount: number;
  selectedResource: ResourceResponse | null;
  viewMode: FileViewMode;
}

function can(
  resource: ResourceResponse | null,
  key: keyof NonNullable<ResourceResponse['capabilities']>,
): boolean {
  return resource?.capabilities?.[key] === true;
}

export function FileToolbar({
  onClearSelection,
  onCreateFolder,
  createFolderDisabled = false,
  onDownload,
  onMove,
  onRefresh,
  onRename,
  onTrash,
  onViewModeChange,
  selectedCount,
  selectedResource,
  viewMode,
}: FileToolbarProps): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMenuOpen((open) => !open), []);

  return (
    <div
      className={styles.toolbar}
      data-testid="file-toolbar"
      role="toolbar"
      aria-label="文件工具栏"
    >
      <button disabled={createFolderDisabled} type="button" onClick={onCreateFolder}>
        新建文件夹
      </button>
      <button type="button" onClick={onRefresh}>
        刷新
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'list'}
        onClick={() => onViewModeChange('list')}
      >
        列表视图
      </button>
      <button
        type="button"
        aria-pressed={viewMode === 'grid'}
        onClick={() => onViewModeChange('grid')}
      >
        宫格视图
      </button>
      <button type="button" aria-expanded={menuOpen} onClick={toggleMenu}>
        更多操作
      </button>
      {menuOpen ? (
        <div className={styles.menu} role="menu" aria-label="资源操作">
          <button
            className={styles.menuItem}
            role="menuitem"
            type="button"
            aria-disabled={!can(selectedResource, 'can_rename')}
            disabled={!can(selectedResource, 'can_rename')}
            onClick={() => {
              if (can(selectedResource, 'can_rename')) onRename?.();
              setMenuOpen(false);
            }}
          >
            重命名
          </button>
          <button
            className={styles.menuItem}
            role="menuitem"
            type="button"
            aria-disabled={!can(selectedResource, 'can_move')}
            disabled={!can(selectedResource, 'can_move')}
            onClick={() => {
              if (can(selectedResource, 'can_move')) onMove?.();
              setMenuOpen(false);
            }}
          >
            移动到
          </button>
          <button
            className={styles.menuItem}
            role="menuitem"
            type="button"
            aria-disabled={!can(selectedResource, 'can_trash')}
            disabled={!can(selectedResource, 'can_trash')}
            onClick={() => {
              if (can(selectedResource, 'can_trash')) onTrash?.();
              setMenuOpen(false);
            }}
          >
            移入回收站
          </button>
          <button
            className={styles.menuItem}
            role="menuitem"
            type="button"
            aria-disabled={!can(selectedResource, 'can_download') || !onDownload}
            disabled={!can(selectedResource, 'can_download') || !onDownload}
            onClick={() => {
              if (can(selectedResource, 'can_download')) onDownload?.();
              setMenuOpen(false);
            }}
          >
            下载
          </button>
        </div>
      ) : null}
      {selectedCount > 0 ? (
        <button type="button" onClick={onClearSelection}>
          清除选择（{selectedCount}）
        </button>
      ) : null}
    </div>
  );
}
