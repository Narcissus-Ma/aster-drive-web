import { expect, type Page } from '@playwright/test';

export const e2eRootResourceId =
  process.env.E2E_ROOT_RESOURCE_ID ?? 'b4e540de-715b-51af-8cd3-567eb1ea6ed6';
export const e2eDeliveryFolderId =
  process.env.E2E_DELIVERY_FOLDER_ID ?? '4abc9d03-092f-5816-857a-c0f15da81166';
export const e2eDocumentId =
  process.env.E2E_DOCUMENT_ID ?? 'c4273d99-d580-5bcf-8f7b-3213590b2641';

export async function resourceRow(page: Page, name: string) {
  const row = page
    .locator('li[data-testid^="resource-row-"]')
    .filter({ hasText: name });
  await expect(row.first()).toBeVisible();
  return row.first();
}

export async function uploadFixture(
  page: Page,
  name = '项目说明.pdf',
  contents = 'Aster Drive E2E fixture',
): Promise<void> {
  await page.getByLabel('选择要上传的文件').setInputFiles({
    buffer: Buffer.from(contents),
    mimeType: 'application/pdf',
    name,
  });
  const row = await resourceRow(page, name);
  await expect(row).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole('listitem').filter({ hasText: name }).getByText('已完成').first(),
  ).toBeVisible({ timeout: 30_000 });
}

export async function moveResource(
  page: Page,
  name: string,
  targetId: string,
): Promise<void> {
  const row = await resourceRow(page, name);
  await row.getByRole('checkbox', { name: `选择 ${name}` }).check();
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: '移动到' }).click();
  await page.getByLabel('目标目录').selectOption(targetId);
  await page.getByRole('button', { name: '移动' }).click();
  await expect(row).toHaveCount(0);
}

export async function trashResource(page: Page, name: string): Promise<void> {
  const row = await resourceRow(page, name);
  await row.getByRole('checkbox', { name: `选择 ${name}` }).check();
  await page.getByRole('button', { name: '更多操作' }).click();
  await page.getByRole('menu').getByRole('menuitem', { name: '移入回收站' }).click();
  await page.getByRole('button', { name: '移入回收站' }).click();
  await expect(row).toHaveCount(0);
}

export async function openSeedDocument(page: Page): Promise<void> {
  await page.goto(`/drive/${e2eRootResourceId}`);
  const row = await resourceRow(page, '冲突文档');
  await row.getByRole('button', { name: /冲突文档/ }).click();
  await expect(page).toHaveURL(new RegExp(`/documents/${e2eDocumentId}$`));
  await expect(page.getByRole('textbox', { name: '文档编辑区' })).toBeVisible();
}

export async function shareResourceWith(
  page: Page,
  name: string,
  granteeUserId: string,
  role: 'viewer' | 'editor',
): Promise<void> {
  const row = await resourceRow(page, name);
  await row.getByRole('button', { name: '文件操作' }).click();
  await row.getByRole('menu').getByRole('menuitem', { name: '共享' }).click();
  await page.getByLabel('成员用户 ID').fill(granteeUserId);
  await page.getByLabel('成员权限').selectOption(role);
  await page.getByRole('button', { name: '邀请成员' }).click();
  await expect(page.getByText(granteeUserId, { exact: true })).toBeVisible();
}

export async function openSharedDocument(page: Page): Promise<void> {
  await page.getByRole('link', { name: '与我共享' }).click();
  const row = await resourceRow(page, '冲突文档');
  await row.getByRole('button', { name: /冲突文档/ }).click();
  await expect(page).toHaveURL(new RegExp(`/documents/${e2eDocumentId}$`));
  await expect(page.getByRole('textbox', { name: '文档编辑区' })).toBeVisible();
}

export async function editDocument(page: Page, value: string): Promise<void> {
  const editor = page.getByRole('textbox', { name: '文档编辑区' });
  await editor.click();
  await editor.press('ControlOrMeta+A');
  await editor.pressSequentially(value);
}
