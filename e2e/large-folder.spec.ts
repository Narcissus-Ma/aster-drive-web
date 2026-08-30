import { expect, test } from '@playwright/test';

import type { ResourceResponse } from '../src/shared/api/generated/openapi';
import { e2eRootResourceId } from './fixtures/files';
import { e2eUsers, loginAs } from './fixtures/users';

function makeResource(index: number): ResourceResponse {
  const id = `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
  const timestamp = '2026-08-30T10:00:00Z';
  return {
    id,
    owner_id: '00000000-0000-4000-8000-000000000001',
    created_by: '00000000-0000-4000-8000-000000000001',
    parent_id: e2eRootResourceId,
    kind: index % 10 === 0 ? 'folder' : 'file',
    state: 'active',
    name: `大目录条目-${String(index + 1).padStart(5, '0')}`,
    name_key: `大目录条目-${String(index + 1).padStart(5, '0')}`,
    declared_mime: index % 10 === 0 ? null : 'text/plain',
    detected_mime: index % 10 === 0 ? null : 'text/plain',
    size_bytes: index % 10 === 0 ? null : 12,
    object_key: index % 10 === 0 ? null : `objects/large/${id}`,
    version: 1,
    updated_at: timestamp,
    created_at: timestamp,
    capabilities: {
      can_download: true,
      can_edit_content: false,
      can_move: true,
      can_rename: true,
      can_share: true,
      can_trash: true,
      can_accept_children: index % 10 === 0,
    },
    effective_role: 'owner',
  };
}

test('10,000 条目录仍保持虚拟列表并可滚动定位', async ({ page }) => {
  await loginAs(page, e2eUsers.owner);

  const items = Array.from({ length: 10_000 }, (_, index) => makeResource(index));
  await page.route('**/api/v1/resources/*/children?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items, next_cursor: null }),
    });
  });

  await page.goto('/drive');
  const list = page.getByTestId('file-list');
  await expect(list).toBeVisible();
  const renderedRowCount = await list.locator('li').count();
  expect(renderedRowCount).toBeLessThan(100);

  const scroll = page.getByTestId('file-list-scroll');
  await scroll.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  await expect(page.getByRole('button', { name: /大目录条目-10000/ })).toBeVisible();
});
