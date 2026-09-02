import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { DirectoryTree } from './directory-tree';
import { FileBreadcrumb } from './file-breadcrumb';
import { FileGrid } from './file-grid';
import { FileList } from './file-list';
import { FileToolbar } from './file-toolbar';
import { ResourceFilterBar } from './resource-filter-bar';

const resource = {
  id: 'resource-a',
  owner_id: 'owner-a',
  created_by: 'owner-a',
  parent_id: 'root-a',
  kind: 'document' as const,
  state: 'active' as const,
  name: '项目计划',
  name_key: '项目计划',
  version: 1,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-02T00:00:00Z',
  effective_role: 'owner',
  capabilities: { can_download: true },
};

describe('文件工作区布局', () => {
  it('为文件区结构组件提供可组合的布局样式钩子', () => {
    render(
      <MemoryRouter>
        <>
          <DirectoryTree currentFolderId="folder-a" />
          <FileBreadcrumb currentFolderId="folder-a" currentFolderName="项目资料" />
          <FileToolbar
            onClearSelection={() => undefined}
            onCreateFolder={() => undefined}
            onRefresh={() => undefined}
            onViewModeChange={() => undefined}
            selectedCount={0}
            selectedResource={null}
            viewMode="list"
          />
          <ResourceFilterBar
            onChange={() => undefined}
            values={{ sortBy: 'name', sortDirection: 'asc' }}
          />
          <FileList
            items={[resource]}
            onOpen={() => undefined}
            onToggle={() => undefined}
            selectedIds={new Set()}
          />
          <FileGrid
            items={[resource]}
            onOpen={() => undefined}
            onToggle={() => undefined}
            selectedIds={new Set()}
          />
        </>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('directory-tree').className).toContain('tree');
    expect(screen.getByTestId('file-breadcrumb').className).toContain('breadcrumb');
    expect(screen.getByTestId('file-toolbar').className).toContain('toolbar');
    expect(screen.getByTestId('resource-filter-bar').className).toContain('filter');
    expect(screen.getByTestId('file-list-scroll').className).toContain('listScroll');
    expect(screen.getByTestId('file-list').className).toContain('list');
    expect(screen.getByTestId('file-grid').className).toContain('grid');
  });
});
