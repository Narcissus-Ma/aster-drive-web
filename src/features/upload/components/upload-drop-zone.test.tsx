import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UploadDropZone } from './upload-drop-zone';

describe('上传拖拽区', () => {
  it('选择文件后回调文件列表并清空 input', () => {
    const onFilesSelected = vi.fn();
    render(<UploadDropZone onFilesSelected={onFilesSelected} />);
    const input = screen.getByLabelText('选择要上传的文件');
    const file = new File(['内容'], '学习资料.txt', { type: 'text/plain' });

    fireEvent.change(input, { target: { files: [file] } });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
    expect(input).toHaveValue('');
  });

  it('拖拽文件进入区域时也能提交文件', () => {
    const onFilesSelected = vi.fn();
    render(<UploadDropZone onFilesSelected={onFilesSelected} />);
    const dropZone = screen.getByTestId('upload-drop-zone');
    const file = new File(['内容'], '拖拽.txt', { type: 'text/plain' });

    fireEvent.drop(dropZone, {
      dataTransfer: { files: [file] },
    });

    expect(onFilesSelected).toHaveBeenCalledWith([file]);
  });
});
