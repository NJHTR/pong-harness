# Seekwd 实现蓝图

前面的文档定义了产品语义；本目录给出一套可直接开工的参考实现。它不是把核心语义绑定到技术，而是选择一套默认实现，让项目可以开始写代码。

## 参考技术栈

```text
Desktop shell       Tauri 2
Workbench           React + TypeScript + Vite
Canvas renderer     React Flow-compatible graph renderer
View state          Zustand
Server facts        Query/cache layer backed by Host subscriptions
Host / Harness      Rust
Async runtime       Tokio
Local persistence   SQLite + WAL + migrations
Artifact store      Content-addressed filesystem + SQLite metadata
Internal protocol   Versioned typed commands and events
Extension protocol  JSON-RPC style messages + JSON Schema manifests
Node workers        Host process, isolated child process, or external context
Tests               Rust tests, TypeScript tests, browser E2E and graph properties
```

## 文档索引

| 文件 | 内容 |
| --- | --- |
| [01-stack-decision.md](01-stack-decision.md) | 技术栈选择和不选择的原因 |
| [02-repository-layout.md](02-repository-layout.md) | 项目目录和模块边界 |
| [03-rust-core-boundaries.md](03-rust-core-boundaries.md) | Rust Host / Harness crate 边界 |
| [04-storage-implementation.md](04-storage-implementation.md) | SQLite、迁移、事件和 Artifact 落盘 |
| [05-host-ipc-implementation.md](05-host-ipc-implementation.md) | Workbench 与 Host 的具体 IPC |
| [06-frontend-implementation.md](06-frontend-implementation.md) | 前端状态、画布编辑器和订阅实现 |
| [07-node-extension-sdk.md](07-node-extension-sdk.md) | 节点 Manifest、SDK 和扩展生命周期 |
| [08-worker-execution.md](08-worker-execution.md) | Worker、执行器、取消和资源限制 |
| [09-agent-runtime-implementation.md](09-agent-runtime-implementation.md) | Agent Planner、工具调用和 GraphPatch |
| [10-security-implementation.md](10-security-implementation.md) | 本地权限、秘密、隔离和审计落地 |
| [11-testing-ci.md](11-testing-ci.md) | 测试层、CI 和故障演练 |
| [12-local-development.md](12-local-development.md) | 本地开发、调试和诊断 |
| [13-build-dependency-order.md](13-build-dependency-order.md) | 按依赖关系的实施顺序 |
| [14-implementation-acceptance.md](14-implementation-acceptance.md) | 实现完成的验收标准 |
| [15-current-implementation-status.md](15-current-implementation-status.md) | 当前代码落地状态与下一执行顺序 |

## 选型边界

前端、Host、存储和协议采用上述默认实现；节点业务实现仍可使用不同语言和执行上下文，只要遵守 Node Manifest、Executor Contract、Artifact 和事件协议。
