---
name: react-file-structure
description: 设计、创建或重构 React 项目的目录、模块边界和文件归属时使用。适用于 feature-first 组织、依赖方向、文件命名和代码就近放置；不负责选择业务功能或替代具体实现方案。
---

# React 项目文件组织

为 React + TypeScript 项目建立可持续演进的目录边界。优先保持业务内聚和依赖单向，避免为了形式完整而提前抽象。

## 核心原则

1. 单一职责：组件负责渲染与交互，Hooks 组织状态和副作用，API 层负责通信，纯函数进入 lib 或 rules。
2. 就近组织：只服务一个 feature 的组件、Hooks、类型、测试和样式保留在该 feature 内。
3. 单向依赖：应用组合层依赖业务功能，业务功能依赖共享基础设施；共享层不得反向依赖业务模块。
4. 谨慎共享：至少有两个稳定使用方且语义一致时，才把代码提升到全局共享目录。
5. 显式边界：跨模块只使用公开入口，不导入其他 feature 的内部文件。

## 推荐结构

```text
src/
├── app/
│   ├── providers/
│   ├── router/
│   └── layouts/
├── pages/
├── features/
│   └── feature-name/
│       ├── components/
│       ├── hooks/
│       ├── api/
│       ├── models/
│       ├── rules/
│       ├── store/
│       └── feature-name.ts
├── components/
├── shared/
│   ├── api/
│   ├── config/
│   ├── lib/
│   └── types/
├── assets/
└── styles/
```

- `app/`：启动、Provider、路由注册和应用级布局。
- `pages/`：路由级组合，不承载可复用业务实现。
- `features/`：按业务能力切片；优先将相关代码保留在同一 feature。
- `components/`：不包含业务规则的跨功能 UI 组件。
- `shared/`：生成的 API 客户端、配置、通用工具和跨功能稳定类型。

## 依赖规则

默认依赖方向：

```text
app/pages -> features -> components/shared
```

- 页面可以组合多个 feature。
- feature 不直接导入另一个 feature 的内部实现；需要组合时由页面或 app 层完成。
- `components/` 和 `shared/` 不依赖 `features/`、`pages/` 或 `app/`。
- 禁止循环依赖。
- 避免多层 barrel export；只有在确实需要稳定公共边界时才创建小型公开入口。

## 文件归属决策

创建或移动文件时依次判断：

1. 是否只负责一个路由的组合？放入 `pages/`。
2. 是否属于一个明确业务能力？放入 `features/<feature>/`。
3. 是否是不含业务语义的复用 UI？放入 `components/`。
4. 是否是跨功能稳定的 API、配置、纯工具或类型？放入 `shared/`。
5. 如果使用方仍只有一个，不要提前提升到共享目录。

## React 与 TypeScript 约束

- 文件和目录统一使用 kebab-case。
- React 使用函数组件和 Hooks，使用具名导出，不使用 Class Component 或默认导出。
- Props 和领域数据优先使用 `interface` 明确定义，避免 `any`。
- 页面交互中间状态留在组件或 feature Hook；跨页面业务状态才进入按功能拆分的 store。
- API 请求通过统一客户端、拦截器或生成代码访问，组件内不直接散落请求实现。
- 样式与组件就近放置并优先使用 CSS Modules。
- 测试文件与被测模块就近放置；测试描述使用简体中文。

## 规模控制

- 目录通常不超过四层；超过时先检查模块边界是否过细。
- 文件接近 300 行时检查是否混合了数据访问、状态、规则和渲染职责；按职责拆分，而不是机械按行数拆分。
- 不创建只有转发作用的空壳层。
- 不因未来可能复用而提前建立全局抽象。

## 变更检查

完成目录或模块调整后检查：

1. 新文件是否位于最接近其业务使用方的位置。
2. 是否产生 feature 间的内部路径导入或循环依赖。
3. 页面是否仍只承担组合职责。
4. API、状态、业务规则和 UI 是否边界清楚。
5. 是否通过项目配置的格式化、Lint、TypeScript 和相关测试命令。
