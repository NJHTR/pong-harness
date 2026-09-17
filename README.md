# Seekwd / Pong Harness

Seekwd 是一个本地优先的 Agent 工作台。用户用自然语言描述目标，Pong Agent 探索环境、发现或创建能力，将行动组织成可编辑节点图，并通过 Pong Harness 调度节点、工具、其他 Agent、执行环境和人工审批。

## 当前可运行内容

- `packages/seekwd-ui`：从 WebSwift 风格演化出的 React 工作台组件库，包含双主题、基础控件、工作台布局和节点外观。
- `apps/ui-lab`：Seekwd UI 的可交互展示页，包含组件状态和工作台缩略原型。

先前设计文档中记录的 `apps/workbench`、`crates/pong-*` 和 Tauri 桌面壳代码不在当前目录中；它们不能视为这个工作树内的可运行实现。UI Lab 是目前的可运行内容，尚未接入真实画布编辑器或 Host。

## 本地开发

```powershell
pnpm install
pnpm dev
```

当前 `pnpm dev` 启动 UI Lab，浏览器预览地址为 `http://127.0.0.1:4173`（端口已被占用时 Vite 会选择其他端口）。UI Lab 只验证组件和交互，不会伪造 Host 保存或执行。

```powershell
pnpm typecheck
pnpm build
```

## 设计文档

完整方案位于 [`docs/seekwd-design`](docs/seekwd-design/00-README.md)。

建议阅读顺序：

1. [产品定位与核心原则](docs/seekwd-design/01-product-vision.md)
2. [类人工作能力模型](docs/seekwd-design/02-capability-model.md)
3. [节点对象模型](docs/seekwd-design/03-node-object-model.md)
4. [画布与组合模型](docs/seekwd-design/04-canvas-composition.md)
5. [Pong Agent 运行时](docs/seekwd-design/05-agent-runtime.md)
6. [未知环境探索与 Agent 委派](docs/seekwd-design/06-exploration-delegation.md)
7. [执行环境与权限](docs/seekwd-design/07-environment-permission.md)
8. [调试、证据、记忆与技能沉淀](docs/seekwd-design/08-debugging-memory-observability.md)
9. [目标执行系统详细设计](docs/seekwd-design/12-goal-execution-design/00-README.md)
10. [节点与画布正式规范](docs/seekwd-design/20-node-canvas-spec/00-README.md)
11. [Pong Harness 基础规范](docs/seekwd-design/21-foundation-spec/00-README.md)
12. [Pong Harness 核心运行时服务](docs/seekwd-design/22-core-runtime-services/00-README.md)
13. [Pong Harness 标准节点库](docs/seekwd-design/23-standard-node-library/00-README.md)
14. [Seekwd / Pong Harness 参考架构](docs/seekwd-design/24-reference-architecture/00-README.md)
15. [参考实现蓝图与工程边界](docs/seekwd-design/25-implementation-blueprint/00-README.md)

讨论中的新结论应同步更新主题文档、[决策记录](docs/seekwd-design/09-decisions.md)和[待确认问题](docs/seekwd-design/10-open-questions.md)。
