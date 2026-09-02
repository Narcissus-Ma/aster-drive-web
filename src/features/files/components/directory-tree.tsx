import { useCallback } from 'react';
import { Link } from 'react-router-dom';

import styles from './directory-tree.module.css';

export interface DirectoryTreeProps {
  currentFolderId: string | undefined;
  currentFolderName?: string;
}

export function DirectoryTree({
  currentFolderId,
  currentFolderName,
}: DirectoryTreeProps): JSX.Element {
  const currentLabel = currentFolderName ?? '当前目录';
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      (event.currentTarget as HTMLElement).blur();
    }
  }, []);

  return (
    <nav
      className={styles.tree}
      data-testid="directory-tree"
      aria-label="目录树"
      onKeyDown={handleKeyDown}
    >
      <p>目录</p>
      <ul>
        <li>
          <Link to="/drive">我的文件</Link>
        </li>
        {currentFolderId ? (
          <li aria-current="page">
            <Link to={`/drive/${encodeURIComponent(currentFolderId)}`}>
              {currentLabel}
            </Link>
          </li>
        ) : null}
      </ul>
    </nav>
  );
}
