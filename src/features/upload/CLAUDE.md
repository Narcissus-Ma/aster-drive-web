# 上传功能模块

## 维护触发器

当上传会话 API、任务状态、预签名传输策略、上传错误码或文件工作区入口发生变化时，需要同步更新本文档与对应测试。

## 模块概述

本模块负责文件选择、拖拽、预签名 PUT 传输、进度展示、取消、续签、完成轮询以及名称冲突恢复。上传任务只保存文件对象和 UI 状态，不直接写入资源 Query 缓存；上传完成后由管理器精确失效对应父目录的资源 Query。

## 文件结构

```text
upload/
├── api/upload-api.ts                  # 上传会话 API 与 XHR transport
├── api/upload-api.test.ts             # API 路径、XHR 进度、取消测试
├── models/upload-task.ts              # 上传任务状态与构造函数
├── models/upload-task.test.ts         # 任务初始状态测试
├── store/upload-task-store.ts         # Zustand 任务队列
├── store/upload-task-store.test.ts    # 队列增删改与清理测试
├── hooks/use-upload-manager.ts        # 状态机、轮询、续签和 Query 失效
├── hooks/use-upload-manager.test.tsx  # 状态转换和恢复测试
└── components/
    ├── upload-drop-zone.tsx           # 文件选择与拖拽入口
    ├── upload-drop-zone.module.css
    ├── upload-task-panel.tsx          # 任务列表、进度和操作
    ├── upload-task-panel.module.css
    ├── name-conflict-dialog.tsx       # 名称冲突改名表单
    └── name-conflict-dialog.module.css
```

## 核心架构

- `upload-api.ts` 通过 `apiClient` 调用元数据接口；预签名 URL 使用独立 XHR transport，避免把认证头发送到对象存储。
- `useUploadTaskStore` 只保存队列任务和可展示状态；AbortController 保存在管理器实例中，避免把不可序列化对象放进全局状态。
- `createUploadManager` 编排 `waiting → uploading → finalizing → completed`，处理 `failed`、`canceled`、`name-conflict` 分支；完成 202 响应后轮询会话状态。
- `useUploadManager` 绑定 QueryClient 和当前父目录，文件工作区只负责传入文件并渲染任务组件。
- 任务完成后调用 `resourceQueryKeys.children({ parentId })` 失效目录 Query；不手工修改 Resource 缓存。

## 已实现功能

- 单次多文件入队与 waiting 状态。
- XHR 上传进度、AbortSignal 取消和网络错误处理。
- 预签名地址 401/403/410 续签后单次重试。
- complete 202 finalizing 轮询和完成后的目录 Query 失效。
- 名称冲突后复用原 session 改名完成，不重复上传字节。
- 拖拽/文件选择入口、任务面板、失败重试和冲突对话框。

## 缺失功能

- P0：与服务端真实 MinIO 的浏览器 PUT 集成 E2E。
- P1：并发上传数量限制、断点续传和页面刷新后的任务恢复。
- P1：更细粒度的文件大小/扩展名策略与国际化词条。
- P2：批量取消、批量重试和任务历史持久化。

## 与旧组件的映射

Task 12 之前文件工作区没有上传入口。本模块通过 `file-workspace.tsx` 接入，不替换现有资源列表、选择和筛选逻辑。
