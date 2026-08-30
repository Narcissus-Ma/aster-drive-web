import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import { PublicSharePage } from './public-share-page';

vi.mock('../hooks/use-public-share', () => ({
  usePublicShare: vi.fn(() => ({
    data: {
      resource_id: 'resource-a',
      kind: 'document',
      read_only: true,
      resource: {
        id: 'resource-a',
        kind: 'document',
        name: '匿名公开文档',
        created_at: '2026-08-30T00:00:00Z',
        updated_at: '2026-08-30T00:00:00Z',
      },
      document: {
        resource_id: 'resource-a',
        content: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: '只读内容' }] },
          ],
        },
        revision: 1,
        content_hash: 'hash-a',
      },
    },
    error: null,
    isError: false,
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

describe('匿名公开访问页面', () => {
  it('在不登录的情况下渲染只读内容且没有编辑入口', () => {
    render(
      <MemoryRouter initialEntries={['/public/share/token-a']}>
        <Routes>
          <Route path="/public/share/:token" element={<PublicSharePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: '匿名公开文档' })).toBeInTheDocument();
    expect(screen.getByText('只读内容')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /编辑|上传/ })).not.toBeInTheDocument();
  });
});
