import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { getPublicShare } from '../../sharing/api/sharing-api';
import { usePublicShare } from './use-public-share';

vi.mock('../../sharing/api/sharing-api', () => ({
  getPublicShare: vi.fn(),
}));

describe('公开访问数据 Hook', () => {
  it('按 token 获取只读公开资源', async () => {
    vi.mocked(getPublicShare).mockResolvedValue({
      resource_id: 'resource-a',
      kind: 'document',
      read_only: true,
      resource: {
        id: 'resource-a',
        kind: 'document',
        name: '公开文档',
        version: 1,
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
      },
      document: {
        resource_id: 'resource-a',
        content: { type: 'doc', content: [] },
        revision: 1,
        content_hash: 'hash-a',
      },
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const { result } = renderHook(() => usePublicShare('token-a'), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.data?.resource.name).toBe('公开文档'));
    expect(getPublicShare).toHaveBeenCalledWith('token-a', expect.anything());
  });
});
