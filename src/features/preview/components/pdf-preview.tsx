import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import styles from './preview-drawer.module.css';

export interface PdfPreviewProps {
  access: ContentAccessResponse;
}

export function PdfPreview({ access }: PdfPreviewProps): JSX.Element {
  return <iframe className={styles.pdf} title={access.filename} src={access.url} />;
}
