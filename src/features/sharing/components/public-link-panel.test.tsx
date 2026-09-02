import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ShareLinkResponse } from '../../../shared/api/generated/openapi';
import { PublicLinkPanel } from './public-link-panel';

describe('公开链接面板', () => {
  it('创建链接并支持复制与撤销', async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: 'link-a',
      resource_id: 'resource-a',
      created_by: 'owner-a',
      role: 'viewer',
      created_at: '2026-08-30T00:00:00Z',
      active: true,
      token: 'token-a',
      url: 'https://drive.example/public/share/token-a',
    });
    const onRevoke = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    render(
      <PublicLinkPanel canShare links={[]} onCreate={onCreate} onRevoke={onRevoke} />,
    );

    await userEvent.click(screen.getByRole('button', { name: '生成公开链接' }));
    expect(
      await screen.findByDisplayValue('https://drive.example/public/share/token-a'),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '复制公开链接' }));
    await userEvent.click(screen.getByRole('button', { name: '撤销公开链接' }));

    expect(writeText).toHaveBeenCalledWith(
      'https://drive.example/public/share/token-a',
    );
    expect(onRevoke).toHaveBeenCalledWith('link-a');
  });

  it('历史列表只有 active 状态时显示链接已生成并允许重新生成', async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: 'link-b',
      resource_id: 'resource-a',
      created_by: 'owner-a',
      role: 'viewer',
      created_at: '2026-08-30T00:00:00Z',
      active: true,
      token: 'token-b',
      url: null,
    });
    const historyLink = {
      id: 'link-history',
      resource_id: 'resource-a',
      created_by: 'owner-a',
      role: 'viewer',
      created_at: '2026-08-29T00:00:00Z',
      revoked_at: null,
      active: true,
      token: null,
      url: null,
    } as ShareLinkResponse;

    render(
      <PublicLinkPanel
        canShare
        links={[historyLink]}
        onCreate={onCreate}
        onRevoke={vi.fn()}
      />,
    );

    expect(screen.getByText('已生成公开链接')).toBeInTheDocument();
    expect(screen.queryByText('尚未生成公开链接')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '重新生成公开链接' }));
    expect(
      await screen.findByDisplayValue('http://localhost:3000/public/share/token-b'),
    ).toBeInTheDocument();
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
