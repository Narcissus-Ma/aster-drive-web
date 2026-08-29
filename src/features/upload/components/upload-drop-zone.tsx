import { useCallback, useRef, useState } from 'react';

import styles from './upload-drop-zone.module.css';

export interface UploadDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

function toFiles(fileList: FileList | null): File[] {
  return fileList === null ? [] : Array.from(fileList);
}

export function UploadDropZone({
  disabled = false,
  onFilesSelected,
}: UploadDropZoneProps): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const submitFiles = useCallback(
    (files: File[]) => {
      if (!disabled && files.length > 0) onFilesSelected(files);
    },
    [disabled, onFilesSelected],
  );

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      submitFiles(toFiles(event.target.files));
      event.target.value = '';
    },
    [submitFiles],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      setIsDragging(false);
      submitFiles(toFiles(event.dataTransfer.files));
    },
    [submitFiles],
  );

  return (
    <label
      className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
      data-testid="upload-drop-zone"
      htmlFor="upload-file-input"
      onDragEnter={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        setIsDragging(false);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <span className={styles.title}>拖拽文件到这里，或选择文件</span>
      <span className={styles.hint}>
        支持批量上传，文件名冲突时可在原上传任务上改名
      </span>
      <input
        ref={inputRef}
        aria-label="选择要上传的文件"
        className={styles.input}
        disabled={disabled}
        id="upload-file-input"
        multiple
        onChange={handleChange}
        type="file"
      />
    </label>
  );
}
