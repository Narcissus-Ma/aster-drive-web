import { useMutation } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  getFileOperationErrorMessage,
  useFileOperation,
  type FileOperationKind,
} from '../../file-operations/hooks/use-file-operation';
import { NameConflictDialog } from '../../upload/components/name-conflict-dialog';
import { UploadDropZone } from '../../upload/components/upload-drop-zone';
import { UploadTaskPanel } from '../../upload/components/upload-task-panel';
import { useUploadManager } from '../../upload/hooks/use-upload-manager';
import type { UploadTask } from '../../upload/models/upload-task';
import { PreviewDrawer } from '../../preview/components/preview-drawer';
import { CopyDialog, type CopySubmitValues } from '../../copy/components/copy-dialog';
import { CopyProgress } from '../../copy/components/copy-progress';
import { useCopyOperation } from '../../copy/hooks/use-copy-operation';
import { ShareDialog } from '../../sharing/components/share-dialog';
import { getDownloadAccess } from '../../preview/api/preview-api';
import { useFileSelection } from '../hooks/use-file-selection';
import { useFileViewState } from '../hooks/use-file-view-state';
import { createFolder } from '../api/resource-api';
import {
  useFolderChildren,
  type FolderChildrenQuery,
} from '../hooks/use-folder-children';
import { useRootResource } from '../hooks/use-root-resource';
import { useResourceDetail } from '../hooks/use-resource-detail';
import { DirectoryTree } from './directory-tree';
import { FileBreadcrumb } from './file-breadcrumb';
import { CreateFolderDialog } from './create-folder-dialog';
import { FileGrid } from './file-grid';
import { FileList } from './file-list';
import { FileToolbar } from './file-toolbar';
import styles from './file-workspace.module.css';
import { ResourceFilterBar, type ResourceFilterValues } from './resource-filter-bar';

const ZERO_ROOT_RESOURCE_ID = '00000000-0000-0000-0000-000000000000';

function normalizeRootResourceId(value: string | undefined): string | null {
  const normalized = value?.trim() ?? '';
  if (!normalized || normalized === ZERO_ROOT_RESOURCE_ID) return null;
  return normalized;
}

const CONFIGURED_ROOT_RESOURCE_ID = normalizeRootResourceId(
  import.meta.env.VITE_ROOT_RESOURCE_ID,
);
const resourceKinds: ResourceKind[] = ['root', 'folder', 'document', 'file'];

interface FileWorkspaceLocationState {
  folderName?: string;
  openResourceId?: string;
}

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
  const locationState = location.state as FileWorkspaceLocationState | null;
  const pendingOpenResourceId = locationState?.openResourceId;
  const handledOpenResourceId = useRef<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const shouldResolveRoot =
    folderId === undefined && CONFIGURED_ROOT_RESOURCE_ID === null;
  const rootQuery = useRootResource({ enabled: shouldResolveRoot });
  const folderDetailQuery = useResourceDetail(folderId);
  const resolvedRootResourceId =
    CONFIGURED_ROOT_RESOURCE_ID ?? rootQuery.data?.id ?? '';
  const parentId = folderId ?? resolvedRootResourceId;
  const currentFolderName = folderId
    ? (locationState?.folderName ?? folderDetailQuery.data?.name ?? '当前目录')
    : (rootQuery.data?.name ?? '我的文件');
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
    error: createFolderError,
    isPending: isCreatingFolder,
    mutateAsync: submitCreateFolder,
    reset: resetCreateFolder,
  } = useMutation({
    mutationFn: ({ name, parentId }: { name: string; parentId: string }) =>
      createFolder({ name, parent_id: parentId }),
  });
  const isRootLoading = shouldResolveRoot && rootQuery.isLoading;
  const rootError = shouldResolveRoot && rootQuery.isError ? rootQuery.error : null;
  const isWorkspaceLoading = isRootLoading || childrenQuery.isLoading;
  const workspaceError = rootError ?? childrenQuery.error;
  const isWorkspaceError = workspaceError !== null && workspaceError !== undefined;
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
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [operationKind, setOperationKind] = useState<FileOperationKind | null>(null);
  const [operationResource, setOperationResource] = useState<ResourceResponse | null>(
    null,
  );
  const [previewResource, setPreviewResource] = useState<ResourceResponse | null>(null);
  const [shareResource, setShareResource] = useState<ResourceResponse | null>(null);
  const [copySourceResource, setCopySourceResource] = useState<ResourceResponse | null>(
    null,
  );
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const operation = useFileOperation();
  const copyOperation = useCopyOperation();
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
        navigate(`/drive/${encodeURIComponent(resource.id)}`, {
          state: { folderName: resource.name },
        });
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

  useEffect(() => {
    if (
      !pendingOpenResourceId ||
      childrenQuery.isLoading ||
      childrenQuery.isError ||
      handledOpenResourceId.current === pendingOpenResourceId
    ) {
      return;
    }
    const target = childrenQuery.items.find(
      (item) => item.id === pendingOpenResourceId,
    );
    if (!target) return;

    handledOpenResourceId.current = pendingOpenResourceId;
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: null,
    });
    handleOpen(target);
  }, [
    childrenQuery.isError,
    childrenQuery.isLoading,
    childrenQuery.items,
    handleOpen,
    location.pathname,
    location.search,
    navigate,
    pendingOpenResourceId,
  ]);

  const handleCreateFolder = useCallback(() => {
    if (!parentId || isRootLoading || isWorkspaceError) return;
    resetCreateFolder();
    setCreateFolderOpen(true);
  }, [isRootLoading, isWorkspaceError, parentId, resetCreateFolder]);

  const closeCreateFolder = useCallback(() => {
    setCreateFolderOpen(false);
    resetCreateFolder();
  }, [resetCreateFolder]);

  const handleCreateFolderSubmit = useCallback(
    async (name: string) => {
      if (!parentId) return;
      try {
        await submitCreateFolder({ name, parentId });
        closeCreateFolder();
        await refetch();
      } catch {
        // 错误交给对话框展示，保留用户输入以便直接修正。
      }
    },
    [closeCreateFolder, parentId, refetch, submitCreateFolder],
  );

  const openOperationForResource = useCallback(
    (kind: FileOperationKind, resource: ResourceResponse) => {
      operation.reset();
      setOperationResource(resource);
      setOperationKind(kind);
    },
    [operation],
  );

  const openOperation = useCallback(
    (kind: FileOperationKind) => {
      if (!selectedResource) return;
      openOperationForResource(kind, selectedResource);
    },
    [openOperationForResource, selectedResource],
  );

  const handleResourceRename = useCallback(
    (resource: ResourceResponse) => openOperationForResource('rename', resource),
    [openOperationForResource],
  );
  const handleResourceMove = useCallback(
    (resource: ResourceResponse) => openOperationForResource('move', resource),
    [openOperationForResource],
  );
  const handleResourceTrash = useCallback(
    (resource: ResourceResponse) => openOperationForResource('trash', resource),
    [openOperationForResource],
  );

  const handleDownload = useCallback(async (resource: ResourceResponse) => {
    if (resource.capabilities?.can_download !== true) return;
    try {
      const access = await getDownloadAccess(resource.id);
      const anchor = document.createElement('a');
      anchor.href = access.url;
      anchor.download = access.filename;
      anchor.rel = 'noreferrer';
      anchor.target = '_blank';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setDownloadError(null);
    } catch (error) {
      setDownloadError(getFileOperationErrorMessage(error));
    }
  }, []);

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
    if (
      resolvedRootResourceId &&
      !folders.some((folder) => folder.id === resolvedRootResourceId)
    ) {
      folders.unshift({
        id: resolvedRootResourceId,
        kind: 'root',
        name: '我的文件',
        parentId: null,
      });
    }
    return folders;
  }, [childrenQuery.items, resolvedRootResourceId]);

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleShare = useCallback((resource: ResourceResponse) => {
    if (resource.capabilities?.can_share !== true) return;
    setShareResource(resource);
  }, []);

  const handleCopy = useCallback(
    (resource: ResourceResponse) => {
      if (resource.capabilities?.can_download !== true) return;
      copyOperation.reset();
      setCopySourceResource(resource);
    },
    [copyOperation],
  );

  const activeCopyResource = useMemo(
    () =>
      copySourceResource
        ? (childrenQuery.items.find((item) => item.id === copySourceResource.id) ??
          copySourceResource)
        : null,
    [childrenQuery.items, copySourceResource],
  );

  const closeCopyDialog = useCallback(() => {
    setCopySourceResource(null);
  }, []);

  const handleCopySubmit = useCallback(
    (values: CopySubmitValues) => {
      if (!activeCopyResource) return;
      void copyOperation
        .start(activeCopyResource, values)
        .then(() => {
          clearSelection();
          setCopySourceResource(null);
        })
        .catch(() => undefined);
    },
    [activeCopyResource, clearSelection, copyOperation, setCopySourceResource],
  );

  const handleOpenCopiedResource = useCallback(
    (resourceId: string) => {
      const copiedResource = copyOperation.operation?.resource;
      if (copiedResource?.id === resourceId) {
        handleOpen(copiedResource);
        return;
      }
      navigate(`/drive/${encodeURIComponent(resourceId)}`);
    },
    [copyOperation.operation?.resource, handleOpen, navigate],
  );

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
    <div
      data-testid="file-workspace"
      className={`${styles.workspace} file-workspace`}
      aria-busy={isWorkspaceLoading || childrenQuery.isFetching}
    >
      <aside className={styles.sidebar}>
        <DirectoryTree
          currentFolderId={folderId}
          currentFolderName={currentFolderName}
        />
      </aside>
      <section
        className={styles.main}
        aria-labelledby="workspace-title"
        aria-describedby="workspace-status"
      >
        <FileBreadcrumb
          currentFolderId={folderId}
          currentFolderName={currentFolderName}
        />
        <header className={styles.header}>
          <div className={styles.heading}>
            <p className={styles.eyebrow}>ASTER DRIVE</p>
            <h1 className={styles.title} id="workspace-title">
              你的文件工作台
            </h1>
            <output className={styles.location} data-testid="workspace-location">
              {`${location.pathname}${location.search}`}
            </output>
          </div>
          <div className={styles.workspaceActions}>
            <FileToolbar
              onClearSelection={clearSelection}
              onCreateFolder={handleCreateFolder}
              createFolderDisabled={!parentId || isRootLoading || isWorkspaceError}
              onDownload={() => {
                if (selectedResource) void handleDownload(selectedResource);
              }}
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
              disabled={parentId.length === 0 || isRootLoading || isWorkspaceError}
              onFilesSelected={handleFilesSelected}
            />
          </div>
        </header>
        <ResourceFilterBar onChange={handleFilterChange} values={filterValues} />
        <p id="workspace-status" className={styles.visuallyHidden} aria-live="polite">
          {isWorkspaceLoading
            ? '正在加载文件…'
            : isWorkspaceError
              ? '加载文件失败'
              : `当前目录有 ${childrenQuery.items.length} 个资源`}
        </p>
        <UploadTaskPanel
          onCancel={cancelUpload}
          onClearCompleted={clearCompletedUploads}
          onResolveNameConflict={handleResolveNameConflict}
          onRetry={retryUpload}
          tasks={uploadTasks}
        />
        {isWorkspaceLoading ? (
          <p className={styles.feedback} role="status" aria-live="polite">
            正在加载文件…
          </p>
        ) : null}
        {isWorkspaceError ? (
          <div className={styles.feedback} role="alert" aria-live="assertive">
            <p>
              {workspaceError instanceof Error
                ? workspaceError.message
                : '加载文件失败'}
            </p>
            <button
              type="button"
              onClick={() => void (rootError ? rootQuery.refetch() : refetch())}
            >
              重新加载
            </button>
          </div>
        ) : null}
        {downloadError ? (
          <p className={styles.feedback} role="alert" aria-live="assertive">
            {downloadError}
          </p>
        ) : null}
        {!isWorkspaceLoading &&
        !isWorkspaceError &&
        childrenQuery.items.length === 0 ? (
          <p className={styles.empty} data-testid="file-empty-state">
            当前目录暂无文件
          </p>
        ) : null}
        {!isWorkspaceLoading && !isWorkspaceError && childrenQuery.items.length > 0 ? (
          viewMode === 'list' ? (
            <FileList
              items={childrenQuery.items}
              onCopy={handleCopy}
              onDownload={handleDownload}
              onMove={handleResourceMove}
              onOpen={handleOpen}
              onRename={handleResourceRename}
              onShare={handleShare}
              onToggle={toggleSelection}
              onTrash={handleResourceTrash}
              selectedIds={selectedIds}
            />
          ) : (
            <FileGrid
              items={childrenQuery.items}
              onCopy={handleCopy}
              onOpen={handleOpen}
              onShare={handleShare}
              onToggle={toggleSelection}
              selectedIds={selectedIds}
            />
          )
        ) : null}
        {childrenQuery.hasNextPage ? (
          <button
            className={styles.loadMore}
            type="button"
            onClick={() => void childrenQuery.loadMore()}
            disabled={childrenQuery.isFetchingNextPage}
            aria-busy={childrenQuery.isFetchingNextPage}
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
      <CopyProgress
        onDismiss={copyOperation.reset}
        onOpenResource={handleOpenCopiedResource}
        operation={copyOperation.operation}
      />
      <CopyDialog
        errorMessage={copyOperation.errorMessage}
        folders={moveFolders}
        isSubmitting={copyOperation.isPending}
        onCancel={closeCopyDialog}
        onSubmit={handleCopySubmit}
        resource={activeCopyResource}
      />
      <NameConflictDialog
        onCancel={() => setConflictTaskId(null)}
        onSubmit={handleConflictSubmit}
        task={selectedConflictTask}
      />
      <CreateFolderDialog
        errorMessage={
          createFolderError ? getFileOperationErrorMessage(createFolderError) : null
        }
        isSubmitting={isCreatingFolder}
        onCancel={closeCreateFolder}
        onSubmit={handleCreateFolderSubmit}
        open={createFolderOpen}
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
