# 文件预览模块

## 维护触发器

- 新增预览类型、修改安全 MIME 白名单或调整签名 URL 消费方式时同步更新本文档。
- 修改 `PreviewDrawer` 的焦点管理、查询取消或文件工作区入口时，必须同步更新预览组件测试。

## 模块概述

该模块负责从内容访问接口取得短时效签名地址，并按服务端确认的 MIME 和处置策略渲染图片、PDF、纯文本或 Markdown。未知类型、危险类型和超出大小限制的文本只提供下载回退，不在浏览器中执行原始内容。

## 文件结构

```text
preview/
├── api/preview-api.ts                         # 预览/下载描述接口
├── hooks/use-preview-resource.ts              # React Query 数据获取、取消和文本解码
└── components/
    ├── preview-drawer.tsx                     # 抽屉、焦点恢复和类型分发
    ├── image-preview.tsx                      # 图片预览
    ├── pdf-preview.tsx                        # PDF iframe 预览
    ├── text-preview.tsx                       # 纯文本/安全 Markdown
    └── unsupported-preview.tsx                # 下载回退
```

## 核心架构

- API 层只调用共享 `ApiClient`，由拦截器统一处理认证和错误。
- `usePreviewResource` 使用 TanStack Query 的 `signal` 传递取消请求；文本内容按 UTF-8 严格解码并执行字节上限检查。
- `PreviewDrawer` 只依据服务端 `previewable`、`disposition` 和探测 MIME 分发组件；图片、PDF、文本渲染器通过动态导入拆分 chunk。
- Markdown 以转义后的纯文本呈现，避免把原始 HTML 或脚本插入 DOM；关闭抽屉时卸载查询观察者并恢复打开前焦点。

## 已实现功能

- 图片、PDF、纯文本和 Markdown 预览。
- 危险/未知 MIME 与过大文本的下载回退。
- 文本请求取消、大小限制和 UTF-8 解码错误提示。
- Escape/关闭按钮/背景点击关闭及焦点恢复。
- 文件工作区单击非目录资源打开预览抽屉。

## 缺失功能

- P1：接入视频、音频和缩略图预览器。
- P1：下载任务进度、失败重试与本地保存提示。
- P2：Markdown 受限格式化渲染（仍需保持 HTML 白名单和 URL 协议校验）。
- P2：预览地址刷新和离线缓存策略。
