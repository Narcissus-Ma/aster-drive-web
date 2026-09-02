import { Link } from 'react-router-dom';

import styles from './file-breadcrumb.module.css';

export interface FileBreadcrumbProps {
  currentFolderId: string | undefined;
  currentFolderName?: string;
}

export function FileBreadcrumb({
  currentFolderId,
  currentFolderName,
}: FileBreadcrumbProps): JSX.Element {
  return (
    <nav
      className={styles.breadcrumb}
      aria-label="面包屑"
      data-testid="file-breadcrumb"
    >
      <ol>
        <li>
          <Link to="/drive">我的文件</Link>
        </li>
        {currentFolderId ? (
          <li aria-current="page">{currentFolderName ?? '当前目录'}</li>
        ) : null}
      </ol>
    </nav>
  );
}
