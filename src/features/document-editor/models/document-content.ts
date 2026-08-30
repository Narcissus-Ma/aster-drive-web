import type {
  DocumentContentResponse,
  ResourceCapabilities,
} from '../../../shared/api/generated/openapi';

export interface DocumentMark extends Record<string, unknown> {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocumentNode extends Record<string, unknown> {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocumentNode[];
  marks?: DocumentMark[];
  text?: string;
}

export interface DocumentContent extends Record<string, unknown> {
  type: 'doc';
  content?: DocumentNode[];
}

export interface DocumentLocationState {
  resourceName?: string;
}

export type DocumentSaveStatus =
  | 'idle'
  | 'dirty'
  | 'saving'
  | 'saved'
  | 'error'
  | 'conflict';

export const EMPTY_DOCUMENT: DocumentContent = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function toDocumentContent(value: unknown): DocumentContent {
  if (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'doc'
  ) {
    return value as DocumentContent;
  }
  return EMPTY_DOCUMENT;
}

export function documentContentFingerprint(content: DocumentContent): string {
  return JSON.stringify(content);
}

export function canEditDocument(
  response: DocumentContentResponse | undefined,
): boolean {
  return response?.capabilities?.can_edit_content === true;
}

export function documentCapabilities(
  response: DocumentContentResponse | undefined,
): ResourceCapabilities {
  return response?.capabilities ?? {};
}
