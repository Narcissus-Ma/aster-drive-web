import type { ContentAccessResponse } from '../../../shared/api/generated/openapi';
import styles from './preview-drawer.module.css';

export interface TextPreviewProps {
  access: ContentAccessResponse;
  text: string;
}

function sanitizeMarkdown(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/(?:javascript|data):/gi, '');
}

export function TextPreview({ access, text }: TextPreviewProps): JSX.Element {
  const content =
    access.detected_mime === 'text/markdown' ? sanitizeMarkdown(text) : text;
  return (
    <pre className={styles.text} data-mime={access.detected_mime}>
      {content}
    </pre>
  );
}
