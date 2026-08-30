import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import styles from './preview-drawer.module.css';

export interface ImagePreviewProps {
  access: ContentAccessResponse;
}

export function ImagePreview({ access }: ImagePreviewProps): JSX.Element {
  return (
    <figure className={styles.mediaFrame}>
      <img className={styles.image} src={access.url} alt={access.filename} />
      <figcaption>{access.filename}</figcaption>
    </figure>
  );
}
