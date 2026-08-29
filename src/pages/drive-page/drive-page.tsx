import { FileWorkspace } from '../../features/files/components/file-workspace';
import styles from './drive-page.module.css';

export function DrivePage(): JSX.Element {
  return (
    <main className={styles.page}>
      <FileWorkspace />
    </main>
  );
}
