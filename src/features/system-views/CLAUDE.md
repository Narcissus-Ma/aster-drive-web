# 系统视图模块

## 维护触发器

- 收藏、最近访问 API 的路径、游标或返回字段变化时，同步更新领域 API、OpenAPI 锁定版本和测试。
- 资源行收藏交互、系统视图路由或打开资源的导航语义变化时，同步更新页面组合层与本文件。

## 模块概述

`system-views` 提供收藏和最近使用两个服务端视图。资源实体由 TanStack Query 管理，页面只负责视图标题、空/错/加载状态、资源打开和收藏 mutation 编排。

## 文件结构

```text
system-views/
├── api/view-api.ts                    # 视图、收藏、最近访问和搜索 API
├── components/
│   ├── system-view-page.tsx           # 收藏/最近页面组合入口
│   └── system-view-page.module.css    # 页面列表与响应式样式
├── hooks/use-system-view.ts           # 无限查询、去重、收藏乐观更新与最近访问 mutation
└── system-views.ts                    # feature 对外公开边界
```

## 核心架构

- `useSystemView` 使用 cursor infinite query，并按资源 ID 去重合并页面。
- 取消收藏先从所有收藏查询缓存中乐观移除；请求失败恢复快照，请求成功不重复拉取。
- 收藏和最近访问请求只通过 `view-api.ts` 调用 `apiClient`，页面不直接依赖请求实现。
- 打开文件类资源时回到其父目录，打开目录类资源时进入目录路由，并将资源 ID 放入导航 state 供后续预览能力接入。

## 已实现功能

- `/favorites` 我的收藏页面。
- `/recent` 最近使用页面。
- 收藏取消、失败回滚和加载更多。
- 资源打开时记录最近访问。

## 缺失功能

- P1：与我共享视图及共享权限筛选。
- P1：系统视图批量选择和批量收藏操作。
- P2：资源预览面板、打开资源 state 的消费和移动端专用布局。

