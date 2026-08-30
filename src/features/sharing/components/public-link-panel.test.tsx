import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { PublicLinkPanel } from './public-link-panel';

describe('公开链接面板', () => {
  it('创建链接并支持复制与撤销', async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: 'link-a',
      resource_id: 'resource-a',
      created_by: 'owner-a',
      role: 'viewer',
      created_at: '2026-08-30T00:00:00Z',
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
});
