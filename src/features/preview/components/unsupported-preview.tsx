import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import styles from './preview-drawer.module.css';

export interface UnsupportedPreviewProps {
  access?: ContentAccessResponse;
  message?: string;
}

export function UnsupportedPreview({
  access,
  message = '该文件类型暂不支持在线预览',
}: UnsupportedPreviewProps): JSX.Element {
  return (
    <div className={styles.unsupported}>
      <p>{message}</p>
      {access?.url ? (
        <a
          download={access.filename}
          href={access.url}
          rel="noreferrer"
          target="_blank"
        >
          下载文件
        </a>
      ) : null}
    </div>
  );
}
