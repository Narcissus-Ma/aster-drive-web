import { useCallback } from 'react';
import { Link } from 'react-router-dom';

export interface DirectoryTreeProps {
  currentFolderId: string | undefined;
}

export function DirectoryTree({ currentFolderId }: DirectoryTreeProps): JSX.Element {
  const currentLabel = currentFolderId ? `目录 ${currentFolderId}` : '我的文件';
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape') {
      (event.currentTarget as HTMLElement).blur();
    }
  }, []);

  return (
    <nav data-testid="directory-tree" aria-label="目录树" onKeyDown={handleKeyDown}>
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
