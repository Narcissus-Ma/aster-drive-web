import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFileViewState } from './use-file-view-state';

describe('文件视图状态', () => {
  beforeEach(() => {
    useFileViewState.getState().setViewMode('list');
  });

  it('视图模式只保存在 Zustand，不写入 URL', () => {
    const { result } = renderHook(() => useFileViewState());

    act(() => {
      result.current.setViewMode('grid');
    });

    expect(result.current.viewMode).toBe('grid');
    expect(window.location.search).toBe('');
  });
});
