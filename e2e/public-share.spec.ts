import { test, expect } from '@playwright/test';

import { resourceRow } from './fixtures/files';
import { e2eUsers, loginAs } from './fixtures/users';

test('匿名公开链接只读可访问且撤销后新请求失效', async ({ browser, page }) => {
  await loginAs(page, e2eUsers.owner);
  await page.goto('/drive');
  const row = await resourceRow(page, '冲突文档');
  await row.getByRole('button', { name: '文件操作' }).click();
  await row.getByRole('menu').getByRole('menuitem', { name: '共享' }).click();
  await page.getByRole('button', { name: '生成公开链接' }).click();

  const publicUrl = await page.getByLabel('公开链接地址').inputValue();
  expect(publicUrl).toContain('/public/share/');
  const publicPage = await browser.newPage();
  try {
    await publicPage.goto(publicUrl);
    await expect(publicPage.getByText('只读公开内容')).toBeVisible();
    await expect(publicPage.getByText('E2E 初始内容')).toBeVisible();

    await page.getByRole('button', { name: '撤销公开链接' }).click();
    await publicPage.reload();
    await expect(
      publicPage.getByRole('heading', { name: '公开链接无效或已失效' }),
    ).toBeVisible();
  } finally {
    await publicPage.close();
  }
});
