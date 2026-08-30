# Aster Drive Web 独立部署

Web 是纯静态产物，可独立发布到 GitHub Pages、对象存储静态托管或任意 CDN。运行时只需要公开的 API Base URL，不应把数据库、MinIO 密钥或服务端签名密钥打进前端。

## 构建配置

- `VITE_API_BASE_URL`：API 的 HTTPS 公网地址，例如 `https://api.example.com`。
- `VITE_ROOT_RESOURCE_ID`：默认根目录资源 ID。
- 所有变量在构建时注入，修改后必须重新构建；不要放入 access token、Cookie 或 MinIO 凭证。

## 发布步骤

```bash
corepack enable
yarn install --immutable
yarn api:check
VITE_API_BASE_URL=https://api.example.com yarn build
```

将 `dist/` 上传到静态托管并启用 HTTPS、压缩、长期缓存和 SPA fallback（未知路径回退到 `index.html`）。带 hash 的 JS/CSS 可以缓存一年，`index.html` 建议 `no-cache`。

API 通过 CORS 允许该 Web origin；Cookie 方案应保持同站点域名，跨站点时使用 `Secure`、`HttpOnly`、`SameSite=None` 并确保 API 与 CDN 全部使用 HTTPS。

## 独立回滚

Web 每个 tag 对应一份不可变静态 artifact。回滚只切换 CDN/Pages 到上一份 artifact，不修改 API 数据；如果 API contract 不兼容，先恢复 API 镜像，再恢复 Web artifact。发布前运行 `yarn api:check`，确认 `openapi.lock.json` 与生成客户端匹配。
