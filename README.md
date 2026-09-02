# Aster Drive Web

Aster Drive 的独立 React 前端工程，使用 Vite、TypeScript 和 Yarn 4 管理。

## 常用命令

```bash
yarn dev
yarn build
yarn type-check
yarn lint
yarn format:check
yarn test
yarn test:docker
```

## Docker 部署

前端可独立构建为 Nginx 镜像运行。生产构建只需要公开的 API 地址；根资源 ID 可选，未提供时前端会通过 API 搜索当前用户的根目录：

```bash
export VITE_API_BASE_URL=https://api.example.com
# 可选：export VITE_ROOT_RESOURCE_ID=<root-resource-id>
docker compose up -d --build
```

详细配置、SPA 回退、缓存、安全响应头和回滚方式见 [`docs/deployment.md`](docs/deployment.md)。

项目按 `app/pages -> features -> components/shared` 组织，后续功能按业务能力就近放入 `src/features/`。
