import { test, expect } from '@playwright/test';

import {
  e2eDeliveryFolderId,
  moveResource,
  resourceRow,
  trashResource,
  uploadFixture,
} from './fixtures/files';
import { e2eUsers, loginAs } from './fixtures/users';

test('上传到共享目录后可回收并恢复', async ({ page }) => {
  const fileName = '项目说明.pdf';
  await loginAs(page, e2eUsers.owner);
  await page.goto('/drive');
  await uploadFixture(page, fileName);
  await moveResource(page, fileName, e2eDeliveryFolderId);

  await page.goto(`/drive/${e2eDeliveryFolderId}`);
  await trashResource(page, fileName);
  await page.getByRole('link', { name: '回收站' }).click();
  const trashItem = page.getByRole('listitem').filter({ hasText: fileName });
  await expect(trashItem).toBeVisible();
  await trashItem.getByRole('button', { name: `恢复${fileName}` }).click();
  await expect(trashItem).toHaveCount(0);

  await page.goto(`/drive/${e2eDeliveryFolderId}`);
  await resourceRow(page, fileName);
});
