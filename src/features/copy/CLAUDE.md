# 复制功能维护说明

## 维护触发器

当复制 API 契约、轮询状态、目标目录选择或文件操作入口发生变化时，需同步更新本页、
`copy-api.ts`、Hook、组件测试和 OpenAPI 生成结果。

## 文件结构

```text
copy/
├── api/copy-api.ts                 # 复制提交与 operation 查询
├── components/copy-dialog.tsx      # 目标目录与副本名称表单
├── components/copy-progress.tsx    # 进度、失败详情和打开副本
└── hooks/use-copy-operation.ts     # 201/202 分支与轮询状态机
```

文件列表/宫格只负责触发 `onCopy`，复制状态归 `features/copy` 管理，避免把 mutation
状态散落到资源展示组件。

## 核心架构

- 服务端 Resource/CopyOperation 类型来自固定的 `api-v0.9.0` OpenAPI 生成文件。
- 原生文档的 201 响应直接进入 succeeded；二进制文件的 202 响应使用 operation id
  轮询，直到 succeeded、failed 或 canceled。
- Query 只在操作完成后失效目标目录和源目录列表；前端不复制后端 ACL 规则，仅按
  `can_download` 控制入口展示。
- 对话框采用 CSS Modules 和函数组件，目录选择器沿用移动操作的纯展示约定，但不共用
  mutation state。

## 已实现与缺失功能

- 已实现：名称/目录选择、文件夹禁用提示、权限入口 gating、进度条、失败详情、完成后
  打开副本和列表/宫格接入。
- P1：递归目录浏览、批量复制、可取消的前端轮询和多任务进度面板。
