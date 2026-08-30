import { useSearchParams } from 'react-router-dom';

import { FileWorkspace } from '../../features/files/components/file-workspace';
import { SharedWithMePage } from '../../features/sharing/components/shared-with-me-page';
import styles from './drive-page.module.css';

export function DrivePage(): JSX.Element {
  const [searchParams] = useSearchParams();
  if (searchParams.get('view') === 'shared') {
    return <SharedWithMePage />;
  }
  return (
    <main className={styles.page} aria-label="文件工作台">
      <FileWorkspace />
    </main>
  );
}
