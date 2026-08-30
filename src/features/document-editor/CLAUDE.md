# 文档编辑器模块

## 维护触发器

当文档 API、Tiptap 扩展、自动保存状态机、冲突恢复交互或编辑器路由发生变化时，需要同步更新本文档与相关测试。

## 模块概述

该模块提供 ASTER DRIVE 的原生文档查看与编辑入口。文档内容使用 Tiptap JSON，服务端通过文档内容 API 返回版本号和能力字段；无编辑权限时复用同一页面呈现只读编辑器。

## 文件结构

- `api/document-api.ts`：文档内容 GET/PUT 请求和版本请求头。
- `components/document-editor-page.tsx`：页面编排、加载状态、编辑器生命周期和冲突恢复。
- `components/editor-toolbar.tsx`：格式化工具栏。
- `components/revision-conflict-dialog.tsx`：版本冲突恢复动作。
- `components/save-status.tsx`：只读、保存中、已保存和错误状态展示。
- `hooks/use-document-editor.ts`：TanStack Query 数据访问和版本状态。
- `hooks/use-document-autosave.ts`：防抖保存、重试、并发编辑排队和冲突熔断。
- `models/document-content.ts`：文档 JSON、能力和保存状态类型。

## 核心架构

页面组件只负责编排 Tiptap 和 UI；API 访问集中在 `api`；数据查询和服务端版本由 `use-document-editor` 管理；本地修改与保存调度由 `use-document-autosave` 管理。PUT 请求携带 `If-Match` 和幂等键，版本冲突不会静默覆盖本地内容。

编辑器路由使用懒加载，避免把 Tiptap 打入文件工作台首屏。文件工作区只负责将文档资源导航到 `/documents/:resourceId`。

## 已实现功能

- 文档 JSON 加载与保存。
- Tiptap 基础文本、列表、引用、代码块、链接和下划线扩展。
- 1 秒防抖自动保存、保存期间的后续编辑排队和网络重试。
- `If-Match` 版本冲突提示，支持加载最新版本或另存为副本入口。
- 查看者只读模式和离开页面前的浏览器未保存提示。

## 缺失功能

- P0：另存为副本需要接入资源复制 API。
- P1：需要接入协同编辑/实时光标协议。
- P1：需要补充标题、表格、图片和附件等高级编辑能力。
- P2：需要增加更细粒度的路由离开拦截和编辑器快捷键帮助。
