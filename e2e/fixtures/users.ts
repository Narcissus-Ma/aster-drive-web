import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface E2EUser {
  email: string;
  password: string;
  role: 'owner' | 'editor' | 'viewer';
}

export const e2eUsers: Record<E2EUser['role'], E2EUser> = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL ?? 'owner@example.com',
    password: process.env.E2E_OWNER_PASSWORD ?? 'owner-password',
    role: 'owner',
  },
  editor: {
    email: process.env.E2E_EDITOR_EMAIL ?? 'editor@example.com',
    password: process.env.E2E_EDITOR_PASSWORD ?? 'editor-password',
    role: 'editor',
  },
  viewer: {
    email: process.env.E2E_VIEWER_EMAIL ?? 'viewer@example.com',
    password: process.env.E2E_VIEWER_PASSWORD ?? 'viewer-password',
    role: 'viewer',
  },
};

export function apiBaseUrl(): string {
  return process.env.E2E_API_BASE_URL ?? 'http://127.0.0.1:18000';
}

export async function loginAs(page: Page, user: E2EUser): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('邮箱').fill(user.email);
  await page.getByLabel('密码').fill(user.password);
  await page.getByRole('button', { name: '登录' }).click();
  await expect(page).toHaveURL(/\/(?:drive)?$/);
  await expect(page.getByTestId('file-workspace')).toBeVisible();
}

export async function userId(
  request: APIRequestContext,
  user: E2EUser,
): Promise<string> {
  const loginResponse = await request.post(`${apiBaseUrl()}/api/v1/auth/login`, {
    data: { email: user.email, password: user.password },
  });
  expect(loginResponse.ok()).toBeTruthy();
  const token = (await loginResponse.json()).access_token as string;
  const meResponse = await request.get(`${apiBaseUrl()}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(meResponse.ok()).toBeTruthy();
  return (await meResponse.json()).id as string;
}
