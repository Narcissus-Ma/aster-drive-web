import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function readRepositoryFile(relativePath) {
  return readFile(resolve(repositoryRoot, relativePath), 'utf8');
}

test('生产 Dockerfile 使用 Node 构建并由 Nginx 托管 dist', async () => {
  const dockerfile = await readRepositoryFile('Dockerfile');

  assert.match(dockerfile, /FROM\s+node:22[^\n]*\s+AS\s+builder/i);
  assert.match(dockerfile, /yarn install --immutable/);
  assert.match(dockerfile, /yarn build/);
  assert.match(dockerfile, /FROM\s+nginx:[^\n]+/i);
  assert.match(
    dockerfile,
    /COPY\s+--from=builder\s+\/app\/dist\s+\/usr\/share\/nginx\/html/i,
  );
  assert.match(
    dockerfile,
    /COPY\s+deploy\/nginx\/default\.conf\s+\/etc\/nginx\/conf\.d\/default\.conf/i,
  );
});

test('Nginx 配置支持 SPA 回退、缓存策略和安全响应头', async () => {
  const nginxConfig = await readRepositoryFile('deploy/nginx/default.conf');

  assert.match(nginxConfig, /try_files\s+\$uri\s+\$uri\/\s+\/index\.html/);
  assert.match(
    nginxConfig,
    /Cache-Control\s+"public,\s*max-age=31536000,\s*immutable"/i,
  );
  assert.match(nginxConfig, /Cache-Control\s+"no-cache"/i);
  assert.match(nginxConfig, /X-Content-Type-Options\s+"?nosniff"?/i);
  assert.match(nginxConfig, /Referrer-Policy\s+"?strict-origin-when-cross-origin"?/i);
});

test('生产 Compose 暴露 Web 健康检查并只注入公开构建参数', async () => {
  const compose = await readRepositoryFile('compose.yaml');

  assert.match(compose, /services:\s*\n\s+web:/);
  assert.match(compose, /VITE_API_BASE_URL/);
  assert.match(compose, /VITE_ROOT_RESOURCE_ID/);
  assert.match(compose, /WEB_PORT/);
  assert.match(compose, /healthcheck:/);
  assert.match(compose, /127\.0\.0\.1:8080/);
});

test('Docker 构建上下文忽略依赖、产物和敏感环境文件', async () => {
  const dockerignore = await readRepositoryFile('.dockerignore');

  assert.match(dockerignore, /^node_modules\/?$/m);
  assert.match(dockerignore, /^dist\/?$/m);
  assert.match(dockerignore, /^\.env$/m);
  assert.match(dockerignore, /^\.env\.\*$/m);
  assert.match(dockerignore, /^\.git\/?$/m);
});
