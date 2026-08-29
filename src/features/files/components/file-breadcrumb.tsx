import { Link } from 'react-router-dom';

export interface FileBreadcrumbProps {
  currentFolderId: string | undefined;
  currentFolderName?: string;
}

export function FileBreadcrumb({
  currentFolderId,
  currentFolderName,
}: FileBreadcrumbProps): JSX.Element {
  return (
    <nav aria-label="面包屑" data-testid="file-breadcrumb">
      <ol>
        <li>
          <Link to="/drive">我的文件</Link>
        </li>
        {currentFolderId ? (
          <li aria-current="page">{currentFolderName ?? `目录 ${currentFolderId}`}</li>
        ) : null}
      </ol>
    </nav>
  );
}
