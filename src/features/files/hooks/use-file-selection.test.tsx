import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useFileSelection } from './use-file-selection';

describe('文件选择状态', () => {
  beforeEach(() => {
    useFileSelection.getState().clear();
  });

  it('支持多选切换并可以清空', () => {
    const { result } = renderHook(() => useFileSelection());

    act(() => {
      result.current.toggle('resource-a');
      result.current.toggle('resource-b');
    });
    expect(result.current.selectedIds).toEqual(new Set(['resource-a', 'resource-b']));

    act(() => {
      result.current.toggle('resource-a');
    });
    expect(result.current.selectedIds).toEqual(new Set(['resource-b']));

    act(() => {
      result.current.clear();
    });
    expect(result.current.selectedIds).toEqual(new Set());
  });
});
