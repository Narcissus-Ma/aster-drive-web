import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';

import type {
  ResourceKind,
  ResourceResponse,
} from '../../../shared/api/generated/openapi';
import { DeleteConfirmDialog } from '../../file-operations/components/delete-confirm-dialog';
import {
  MovePickerDialog,
  type MoveFolderOption,
} from '../../file-operations/components/move-picker-dialog';
import { RenameDialog } from '../../file-operations/components/rename-dialog';
import {
  useFileOperation,
  type FileOperationKind,
} from '../../file-operations/hooks/use-file-operation';
import { NameConflictDialog } from '../../upload/components/name-conflict-dialog';
import { UploadDropZone } from '../../upload/components/upload-drop-zone';
import { UploadTaskPanel } from '../../upload/components/upload-task-panel';
import { useUploadManager } from '../../upload/hooks/use-upload-manager';
import type { UploadTask } from '../../upload/models/upload-task';
import { PreviewDrawer } from '../../preview/components/preview-drawer';
import { ShareDialog } from '../../sharing/components/share-dialog';
import { useFileSelection } from '../hooks/use-file-selection';
import { useFileViewState } from '../hooks/use-file-view-state';
import {
  useFolderChildren,
  type FolderChildrenQuery,
} from '../hooks/use-folder-children';
import { DirectoryTree } from './directory-tree';
import { FileBreadcrumb } from './file-breadcrumb';
import { FileGrid } from './file-grid';
import { FileList } from './file-list';
import { FileToolbar } from './file-toolbar';
import styles from './file-workspace.module.css';
import { ResourceFilterBar, type ResourceFilterValues } from './resource-filter-bar';

const ROOT_RESOURCE_ID = import.meta.env.VITE_ROOT_RESOURCE_ID ?? '';
const resourceKinds: ResourceKind[] = ['root', 'folder', 'document', 'file'];

function parseFilters(searchParams: URLSearchParams): ResourceFilterValues {
  const kindValue = searchParams.get('kind') as ResourceKind | null;
  return {
    kind: kindValue && resourceKinds.includes(kindValue) ? kindValue : undefined,
    sortBy: searchParams.get('sort_by') === 'updated_at' ? 'updated_at' : 'name',
    sortDirection: searchParams.get('sort_direction') === 'desc' ? 'desc' : 'asc',
    updatedFrom: searchParams.get('updated_from') ?? undefined,
    updatedTo: searchParams.get('updated_to') ?? undefined,
  };
}

function writeFiltersToSearchParams(values: ResourceFilterValues): URLSearchParams {
  const next = new URLSearchParams();
  if (values.kind) next.set('kind', values.kind);
  if (values.updatedFrom) next.set('updated_from', values.updatedFrom);
  if (values.updatedTo) next.set('updated_to', values.updatedTo);
  if (values.sortBy !== 'name') next.set('sort_by', values.sortBy);
  if (values.sortDirection !== 'asc') next.set('sort_direction', values.sortDirection);
  return next;
}

export function FileWorkspace(): JSX.Element {
  const { folderId } = useParams<{ folderId?: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const parentId = folderId ?? ROOT_RESOURCE_ID;
  const filterValues = useMemo(() => parseFilters(searchParams), [searchParams]);
  const query = useMemo<FolderChildrenQuery>(
    () => ({
      parentId,
      kind: filterValues.kind,
      updatedFrom: filterValues.updatedFrom,
      updatedTo: filterValues.updatedTo,
      sortBy: filterValues.sortBy,
      sortDirection: filterValues.sortDirection,
    }),
    [filterValues, parentId],
  );
  const childrenQuery = useFolderChildren(query);
  const {
    cancel: cancelUpload,
    clearCompleted: clearCompletedUploads,
    conflictTask,
    enqueueFiles,
    retry: retryUpload,
    retryName,
    tasks: uploadTasks,
  } = useUploadManager({ parentId });
  const selectedIds = useFileSelection((state) => state.selectedIds);
  const toggleSelection = useFileSelection((state) => state.toggle);
  const clearSelection = useFileSelection((state) => state.clear);
  const viewMode = useFileViewState((state) => state.viewMode);
  const setViewMode = useFileViewState((state) => state.setViewMode);
  const [conflictTaskId, setConflictTaskId] = useState<string | null>(null);
  const [operationKind, setOperationKind] = useState<FileOperationKind | null>(null);
  const [operationResource, setOperationResource] = useState<ResourceResponse | null>(
    null,
  );
  const [previewResource, setPreviewResource] = useState<ResourceResponse | null>(null);
  const [shareResource, setShareResource] = useState<ResourceResponse | null>(null);
  const operation = useFileOperation();
  const refetch = childrenQuery.refetch;

  useEffect(() => {
    clearSelection();
  }, [clearSelection, parentId]);

  const selectedResource = useMemo(
    () => childrenQuery.items.find((item) => selectedIds.has(item.id)) ?? null,
    [childrenQuery.items, selectedIds],
  );

  const handleFilterChange = useCallback(
    (changes: Partial<ResourceFilterValues>) => {
      const nextValues = { ...filterValues, ...changes };
      setSearchParams(writeFiltersToSearchParams(nextValues));
    },
    [filterValues, setSearchParams],
  );

  const handleOpen = useCallback(
    (resource: ResourceResponse) => {
      if (resource.kind === 'folder' || resource.kind === 'root') {
        navigate(`/drive/${encodeURIComponent(resource.id)}`);
        return;
      }
      if (resource.kind === 'document') {
        navigate(`/documents/${encodeURIComponent(resource.id)}`, {
          state: { resourceName: resource.name },
        });
        return;
      }
      setPreviewResource(resource);
    },
    [navigate],
  );

  const handleCreateFolder = useCallback(() => {
    // 创建接口在后续任务接入，当前先保留工作台入口和可测试的交互边界。
  }, []);

  const openOperation = useCallback(
    (kind: FileOperationKind) => {
      if (!selectedResource) return;
      operation.reset();
      setOperationResource(selectedResource);
      setOperationKind(kind);
    },
    [operation, selectedResource],
  );

  const activeOperationResource = useMemo(
    () =>
      operationResource
        ? (childrenQuery.items.find((item) => item.id === operationResource.id) ??
          operationResource)
        : null,
    [childrenQuery.items, operationResource],
  );

  const closeOperation = useCallback(() => {
    setOperationKind(null);
    setOperationResource(null);
    operation.reset();
  }, [operation]);

  const handleRename = useCallback(
    async (name: string) => {
      if (!activeOperationResource) return;
      try {
        await operation.rename(activeOperationResource, name);
        clearSelection();
        closeOperation();
      } catch {
        // 错误由统一 mutation hook 映射并展示在对话框中。
      }
    },
    [activeOperationResource, clearSelection, closeOperation, operation],
  );

  const handleMove = useCallback(
    async (targetParentId: string) => {
      if (!activeOperationResource) return;
      try {
        await operation.move(activeOperationResource, targetParentId);
        clearSelection();
        closeOperation();
      } catch {
        // 错误由统一 mutation hook 映射并展示在对话框中。
      }
    },
    [activeOperationResource, clearSelection, closeOperation, operation],
  );

  const handleTrash = useCallback(async () => {
    if (!activeOperationResource) return;
    try {
      await operation.trash(activeOperationResource);
      clearSelection();
      closeOperation();
    } catch {
      // 共享结构根等权限错误保留在确认对话框中。
    }
  }, [activeOperationResource, clearSelection, closeOperation, operation]);

  const moveFolders = useMemo<MoveFolderOption[]>(() => {
    const folders: MoveFolderOption[] = childrenQuery.items
      .filter((item) => item.kind === 'folder' || item.kind === 'root')
      .map((item) => ({
        id: item.id,
        kind: item.kind as MoveFolderOption['kind'],
        name: item.name,
        parentId: item.parent_id,
      }));
    if (ROOT_RESOURCE_ID && !folders.some((folder) => folder.id === ROOT_RESOURCE_ID)) {
      folders.unshift({
        id: ROOT_RESOURCE_ID,
        kind: 'root',
        name: '我的文件',
        parentId: null,
      });
    }
    return folders;
  }, [childrenQuery.items]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleShare = useCallback((resource: ResourceResponse) => {
    if (resource.capabilities?.can_share !== true) return;
    setShareResource(resource);
  }, []);

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      void enqueueFiles(files);
    },
    [enqueueFiles],
  );

  const handleResolveNameConflict = useCallback((task: UploadTask) => {
    setConflictTaskId(task.id);
  }, []);

  const selectedConflictTask = useMemo(
    () =>
      conflictTaskId === null
        ? null
        : (uploadTasks.find((task) => task.id === conflictTaskId) ?? conflictTask),
    [conflictTask, conflictTaskId, uploadTasks],
  );

  const handleConflictSubmit = useCallback(
    (task: (typeof uploadTasks)[number], name: string) => {
      void retryName(task, name)
        .catch(() => undefined)
        .finally(() => setConflictTaskId(null));
    },
    [retryName],
  );

  return (
    <div data-testid="file-workspace" className="file-workspace">
      <aside>
        <DirectoryTree currentFolderId={folderId} />
      </aside>
      <section aria-labelledby="workspace-title">
        <FileBreadcrumb currentFolderId={folderId} />
        <header>
          <div>
            <p>ASTER DRIVE</p>
            <h1 id="workspace-title">你的文件工作台</h1>
            <output data-testid="workspace-location">{`${location.pathname}${location.search}`}</output>
          </div>
          <div className={styles.workspaceActions}>
            <FileToolbar
              onClearSelection={clearSelection}
              onCreateFolder={handleCreateFolder}
              onMove={() => openOperation('move')}
              onRefresh={handleRefresh}
              onRename={() => openOperation('rename')}
              onTrash={() => openOperation('trash')}
              onViewModeChange={setViewMode}
              selectedCount={selectedIds.size}
              selectedResource={selectedResource}
              viewMode={viewMode}
            />
            <UploadDropZone
              disabled={parentId.length === 0}
              onFilesSelected={handleFilesSelected}
            />
          </div>
        </header>
        <ResourceFilterBar onChange={handleFilterChange} values={filterValues} />
        <UploadTaskPanel
          onCancel={cancelUpload}
          onClearCompleted={clearCompletedUploads}
          onResolveNameConflict={handleResolveNameConflict}
          onRetry={retryUpload}
          tasks={uploadTasks}
        />
        {childrenQuery.isLoading ? <p role="status">正在加载文件…</p> : null}
        {childrenQuery.isError ? (
          <div role="alert">
            <p>
              {childrenQuery.error instanceof Error
                ? childrenQuery.error.message
                : '加载文件失败'}
            </p>
            <button type="button" onClick={() => void refetch()}>
              重新加载
            </button>
          </div>
        ) : null}
        {!childrenQuery.isLoading &&
        !childrenQuery.isError &&
        childrenQuery.items.length === 0 ? (
          <p data-testid="file-empty-state">当前目录暂无文件</p>
        ) : null}
        {!childrenQuery.isLoading &&
        !childrenQuery.isError &&
        childrenQuery.items.length > 0 ? (
          viewMode === 'list' ? (
            <FileList
              items={childrenQuery.items}
              onOpen={handleOpen}
              onShare={handleShare}
              onToggle={toggleSelection}
              selectedIds={selectedIds}
            />
          ) : (
            <FileGrid
              items={childrenQuery.items}
              onOpen={handleOpen}
              onShare={handleShare}
              onToggle={toggleSelection}
              selectedIds={selectedIds}
            />
          )
        ) : null}
        {childrenQuery.hasNextPage ? (
          <button
            type="button"
            onClick={() => void childrenQuery.loadMore()}
            disabled={childrenQuery.isFetchingNextPage}
          >
            {childrenQuery.isFetchingNextPage ? '正在加载更多…' : '加载更多'}
          </button>
        ) : null}
      </section>
      {previewResource ? (
        <PreviewDrawer
          onClose={() => setPreviewResource(null)}
          open
          resource={previewResource}
        />
      ) : null}
      <ShareDialog
        open={shareResource !== null}
        resource={shareResource}
        onClose={() => setShareResource(null)}
      />
      <NameConflictDialog
        onCancel={() => setConflictTaskId(null)}
        onSubmit={handleConflictSubmit}
        task={selectedConflictTask}
      />
      <RenameDialog
        errorMessage={operationKind === 'rename' ? operation.errorMessage : null}
        isSubmitting={operationKind === 'rename' && operation.isPending}
        onCancel={closeOperation}
        onSubmit={handleRename}
        resource={operationKind === 'rename' ? activeOperationResource : null}
      />
      <MovePickerDialog
        errorMessage={operationKind === 'move' ? operation.errorMessage : null}
        folders={moveFolders}
        isSubmitting={operationKind === 'move' && operation.isPending}
        onCancel={closeOperation}
        onSubmit={handleMove}
        resource={operationKind === 'move' ? activeOperationResource : null}
      />
      <DeleteConfirmDialog
        errorMessage={operationKind === 'trash' ? operation.errorMessage : null}
        isSubmitting={operationKind === 'trash' && operation.isPending}
        mode="trash"
        onCancel={closeOperation}
        onConfirm={handleTrash}
        resource={operationKind === 'trash' ? activeOperationResource : null}
      />
    </div>
  );
}
