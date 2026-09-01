# Web 发布检查清单

- [ ] `yarn install --immutable` 成功且 lockfile 没有变化。
- [ ] `yarn api:check` 通过，API release 与 `openapi.lock.json` 一致。
- [ ] `yarn format:check`、`yarn lint`、`yarn type-check`、`yarn test`、`yarn build` 全部通过。
- [ ] `yarn test:docker` 通过，Dockerfile、Nginx 和 Compose 配置符合约束。
- [ ] Docker 镜像构建通过，已扫描 CRITICAL/HIGH 漏洞，且只注入 `VITE_API_BASE_URL`、`VITE_ROOT_RESOURCE_ID` 等公开构建参数。
- [ ] 容器健康检查、SPA fallback、静态资源缓存和安全响应头已验证。
- [ ] 已安装 Chromium 并通过 `yarn test:e2e`；确认无 console error、未处理请求和残留上传/复制任务。
- [ ] `VITE_API_BASE_URL` 指向 HTTPS API，未包含任何私密凭证。
- [ ] API CORS allowlist 包含当前 Web origin，Cookie Domain/SameSite/Secure 与部署域名匹配。
- [ ] CDN 配置 SPA fallback、压缩、安全响应头和静态资源缓存策略。
- [ ] 记录本次 Web tag、API release、OpenAPI sha256、构建产物和回滚 artifact。
