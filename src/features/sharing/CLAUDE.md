# 共享功能维护说明

## 维护触发器

当共享 API、`ResourceCapabilities`、授权角色或公开链接响应字段变化时，需要同步更新本 feature、OpenAPI 锁文件和相关测试。

## 组件概述

本 feature 负责登录用户的成员共享管理和“与我共享”列表。共享弹窗组合成员权限列表与公开链接面板；资源列表只在服务端返回 `can_share` 时展示入口。

## 核心架构

- `api/sharing-api.ts` 是共享后端的唯一请求封装，所有请求通过 `apiClient`。
- `hooks/use-sharing.ts` 使用 TanStack Query 管理资源共享设置和成员 mutation；成员角色更新沿用授权写入契约。
- `useSharedWithMe` 保留服务端共享根投影，不在客户端推导或去重嵌套授权。
- 组件使用 CSS Modules，管理控件由 `canShare` capability 控制。

## 已实现功能

- 已注册用户的查看/编辑授权、撤销授权和角色选择。
- 公开链接创建、复制、撤销，以及共享给我的游标分页列表。
- 资源行、宫格和文件工作区的共享入口。

## 缺失功能

- 用户搜索、批量邀请和邀请通知。
- 角色变更的独立 PATCH 契约；当前 UI 复用后端授权写入接口，后续若后端拆出专用接口需同步 API 与 hook。
