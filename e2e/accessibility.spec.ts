import { expect, test } from '@playwright/test';

import { e2eUsers, loginAs } from './fixtures/users';

test('文件工作台可通过跳过链接和键盘进入主要内容', async ({ page }) => {
  await loginAs(page, e2eUsers.owner);
  await page.goto('/drive');

  await page.keyboard.press('Tab');
  await expect(page.getByTestId('skip-link')).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('main-content')).toBeFocused();
  await expect(page.getByRole('navigation', { name: '主导航' })).toBeVisible();
});

test('文件工作台的异步状态使用可访问的 live region', async ({ page }) => {
  await loginAs(page, e2eUsers.owner);
  await page.goto('/drive');

  await expect(page.getByTestId('file-workspace')).toBeVisible();
  await expect(page.locator('[aria-live="polite"]').first()).toBeAttached();
});
