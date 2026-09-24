# Seekwd / Pong Harness

Seekwd 是一个本地优先的 Agent 工作台。用户用自然语言描述目标，Pong Agent 探索环境、发现或创建能力，将行动组织成可编辑节点图，并通过 Pong Harness 调度节点、工具、其他 Agent、执行环境和人工审批。

## 当前可运行内容

- `packages/seekwd-ui`：从 WebSwift 风格演化出的 React 工作台组件库，包含双主题、基础控件、工作台布局和节点外观。
- `apps/ui-lab`：Seekwd UI 的可交互设计原型，部分操作使用内存 Mock。
- `apps/workbench`：独立的 React/Vite 产品前端入口，提供有限的 Workspace、Canvas 和 Run 操作；画布图仍主要是静态展示。
- `crates/pong-core`、`crates/pong-host`：本地 Rust Host 的最小模型和 HTTP 接口。Host 使用 SQLite 保存快照、Run 幂等日志和快照更新游标。

Workbench 默认使用浏览器 `localStorage` 适配器；设置 `VITE_HOST_URL` 后才能连接本地 Host。Host 的 Run 仍是约 1.6 秒的模拟完成，不执行节点、文件操作或测试；尚无真实 Worker、LocalRestricted 沙箱或 Tauri 桌面壳。当前 HTTP Host 没有正式认证边界，只限受控的本地开发验证，不可开放任意执行能力。

## 本地开发

```powershell
pnpm install
pnpm dev
```

`pnpm dev` 启动 UI Lab。正式前端的纵向原型可以单独运行：

```powershell
cargo run -p pong-host
$env:VITE_HOST_URL = "http://127.0.0.1:4317"
pnpm dev:workbench
```

Host 默认在当前目录创建 `pong-host.sqlite3`；可用 `PONG_HOST_DB` 指定本地测试数据库。不要将该开发接口暴露给其他设备或不可信网页。

```powershell
pnpm typecheck
pnpm build
cargo test --workspace
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
