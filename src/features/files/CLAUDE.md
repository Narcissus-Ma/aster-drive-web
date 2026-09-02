# 文件工作区维护说明

## 维护触发器

当资源/上传 API 契约、目录路由参数、筛选排序字段、权限 capability 或列表渲染模式发生变化时，需要同步更新本文档、对应测试和 `openapi.lock.json`。

## 功能概述

`files` feature 提供 Aster Drive 的桌面文件工作区骨架：目录导航、面包屑、列表/宫格切换、游标分页、筛选排序、多选和 capability 驱动的结构操作菜单。资源实体只保存在 TanStack Query 缓存中，Zustand 仅保存选择 ID 和视图模式。

## 文件结构

```text
src/features/files/
├── api/resource-api.ts                 # root/children/detail/create 请求封装
├── components/
│   ├── create-folder-dialog.tsx        # 新建文件夹对话框
│   ├── create-folder-dialog.module.css # 对话框样式
│   ├── directory-tree.tsx              # 目录树导航
│   ├── directory-tree.module.css       # 目录树样式
│   ├── file-breadcrumb.tsx             # 面包屑导航
│   ├── file-breadcrumb.module.css      # 面包屑样式
│   ├── file-grid.tsx                   # 宫格渲染
│   ├── file-grid.module.css            # 宫格样式
│   ├── file-layout.test.tsx            # 工作区布局回归测试
│   ├── file-list.tsx                   # 列表与长列表虚拟化
│   ├── file-list.module.css            # 列表样式
│   ├── file-toolbar.tsx                # 工具栏与 capability 菜单
│   ├── file-toolbar.module.css         # 工具栏样式
│   ├── file-workspace.module.css       # 工作区操作区响应式布局
│   ├── file-workspace.tsx              # feature 组合入口与上传入口
│   ├── resource-filter-bar.module.css  # 筛选器样式
│   ├── resource-row.tsx                # 单个资源行、键盘入口和资源操作入口
│   └── resource-row.module.css         # 资源行样式
├── hooks/
│   ├── use-file-selection.ts           # 选择状态公开入口
│   ├── use-file-view-state.ts          # 视图模式公开入口
│   ├── use-folder-children.ts          # infinite query 与错误恢复
│   ├── use-resource-detail.ts          # 深链接目录名称查询
│   └── use-root-resource.ts            # 动态解析当前用户根目录
└── store/
    ├── file-selection-store.ts         # 只保存 resource ID
    └── file-view-state.ts              # 只保存 list/grid
```

页面组合位于 `src/pages/drive-page/drive-page.tsx`，应用级认证布局位于 `src/app/layouts/app-shell.tsx`，不应从本 feature 反向依赖页面或布局内部实现。

## 核心架构

- URL 保存 `folderId`、类型/更新时间筛选和排序字段/方向，筛选变更使用浏览器历史记录，支持前进后退。
- `useFolderChildren` 使用 TanStack Query 的 cursor infinite query，并按资源 ID 合并分页，避免重复项；共享视图使用独立 hook，不复用该去重策略。
- 403 会刷新当前资源 detail/capabilities；404 只清理非活动资源缓存并回退到有效父目录或工作区根路由，避免活动查询被清理后再次请求。
- 无有效 `VITE_ROOT_RESOURCE_ID` 时，`useRootResource` 通过搜索接口解析当前用户根目录；请求失败显示可重试错误态。
- 视图模式和选择 ID 使用按功能拆分的 Zustand store；不把服务端资源实体复制到全局 store。
- 列表超过 50 项时启用 TanStack Virtual，仅渲染可见行；小列表保持完整语义树以便键盘和辅助技术访问。

## 已实现功能

- React Router `/drive/:folderId?` 工作区路由和认证守卫。
- children/detail API 请求、固定 `api-v0.8.0` OpenAPI Client。
- 列表/宫格、目录树、面包屑、筛选排序、多选、空/错/加载状态。
- 基于后端 capabilities 的重命名、移动、回收站和下载菜单禁用状态，并连接已有操作/下载 API。
- 新建文件夹对话框校验名称、提交 API 并刷新当前目录。
- 基于 `can_share` capability 的资源行/宫格共享入口，并在工作区组合共享对话框。
- 上传拖拽/文件选择、任务队列、进度、取消、续签和名称冲突恢复入口。
- 退出登录入口与响应错误恢复测试。

## 缺失功能

- **P0**：后端 current-user DTO 尚未返回根目录 ID；当前通过 `VITE_ROOT_RESOURCE_ID`（可选）或搜索接口解析无参数 `/drive` 路由。
- **P1**：共享成员的用户搜索和批量授权；当前共享对话框要求输入已注册用户 ID。
- **P1**：重型预览器、拖拽排序和移动端布局。

## 与旧组件映射

Task 6 的 `HomePage` 保留为历史演示页面；当前根路由和 `/drive` 路由统一组合 `DrivePage -> FileWorkspace`，认证能力继续复用 `AuthSessionProvider` 与 `LogoutButton`。
