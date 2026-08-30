import { test, expect } from '@playwright/test';

import {
  editDocument,
  e2eDocumentId,
  openSeedDocument,
  openSharedDocument,
  shareResourceWith,
} from './fixtures/files';
import { e2eUsers, loginAs, userId } from './fixtures/users';

test('共享编辑者遇到文档版本冲突后可以加载最新版本恢复', async ({
  browser,
  page,
  request,
}) => {
  await loginAs(page, e2eUsers.owner);
  await page.goto('/drive');
  const editorId = await userId(request, e2eUsers.editor);
  await shareResourceWith(page, '冲突文档', editorId, 'editor');

  const editorContext = await browser.newContext();
  const editorPage = await editorContext.newPage();
  try {
    await loginAs(editorPage, e2eUsers.editor);
    await openSharedDocument(editorPage);
    await openSeedDocument(page);

    await editDocument(page, '所有者已保存版本');
    await expect(page.getByTestId('document-save-status')).toContainText('已保存', {
      timeout: 10_000,
    });

    await editDocument(editorPage, '编辑者旧版本');
    await expect(editorPage.getByTestId('document-save-status')).toContainText(
      '存在版本冲突',
      { timeout: 10_000 },
    );
    await expect(
      editorPage.getByRole('button', { name: '加载最新版本' }),
    ).toBeVisible();
    await editorPage.getByRole('button', { name: '加载最新版本' }).click();
    await expect(editorPage).toHaveURL(new RegExp(`/documents/${e2eDocumentId}$`));
    await expect(editorPage.getByTestId('document-save-status')).toContainText(
      '等待编辑',
    );

    // 恢复确定性种子正文，避免后续公开分享用例被本用例的编辑内容污染。
    await editDocument(page, 'E2E 初始内容');
    await expect(page.getByTestId('document-save-status')).toContainText('已保存', {
      timeout: 10_000,
    });
  } finally {
    await editorContext.close();
  }
});
