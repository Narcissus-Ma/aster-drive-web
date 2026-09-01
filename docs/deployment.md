# Aster Drive Web 独立部署

Web 是纯静态前端，可选择直接发布 `dist/`，也可打包为 Nginx Docker 镜像独立运行。无论哪种方式，运行时只需要公开的 API Base URL，不应把数据库、MinIO 密钥或服务端签名密钥打进前端。

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

## Docker 部署

Docker 镜像采用 Node 22 多阶段构建和 Nginx Alpine 运行时，容器内监听 `8080`，只托管静态资源，不包含 API 服务。生产环境建议将容器放在反向代理或负载均衡之后，并由代理终止 TLS。

```bash
export VITE_API_BASE_URL=https://api.example.com
export VITE_ROOT_RESOURCE_ID=00000000-0000-0000-0000-000000000000
docker compose up -d --build
curl -fsS http://127.0.0.1:8080/
docker compose ps
```

也可以直接构建和运行镜像：

```bash
docker build \
  --build-arg VITE_API_BASE_URL=https://api.example.com \
  --build-arg VITE_ROOT_RESOURCE_ID=00000000-0000-0000-0000-000000000000 \
  --tag aster-drive-web:local .
docker run --rm --publish 8080:8080 aster-drive-web:local
```

`VITE_*` 是构建时公开配置，修改后必须重新构建镜像。Compose 默认只绑定宿主机 `127.0.0.1:8080`，外部访问应通过受控反向代理；`read_only` 文件系统、Nginx 健康检查和 `no-new-privileges` 已在生产 Compose 中启用。

Nginx 配置包含：

- React Router history fallback：未知页面路径回退到 `/index.html`。
- `index.html` 使用 `no-cache`，带 hash 的 `/assets/` 使用一年 immutable 缓存。
- CSP、`X-Content-Type-Options`、`X-Frame-Options`、`Referrer-Policy` 和 `Permissions-Policy`。

API 通过 CORS 允许该 Web origin；Cookie 方案应保持同站点域名，跨站点时使用 `Secure`、`HttpOnly`、`SameSite=None` 并确保 API 与 CDN 全部使用 HTTPS。

## 独立回滚

Web 每个 tag 同时可对应一份不可变静态 artifact 和一份 GHCR 镜像。静态部署回滚只切换 CDN/Pages artifact；容器部署回滚只切换到上一份镜像 SHA，不修改 API 数据。若 API contract 不兼容，先恢复 API 镜像，再恢复 Web artifact 或 Web 镜像。发布前运行 `yarn api:check`，确认 `openapi.lock.json` 与生成客户端匹配。
