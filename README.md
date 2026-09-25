# Seekwd / Pong Harness

Seekwd 是一个本地优先的 Agent 工作台。用户用自然语言描述目标，Pong Agent 探索环境、发现或创建能力，将行动组织成可编辑节点图，并通过 Pong Harness 调度节点、工具、其他 Agent、执行环境和人工审批。

## 当前可运行内容

- `packages/seekwd-ui`：从 WebSwift 风格演化出的 React 工作台组件库，包含双主题、基础控件、工作台布局和节点外观。
- `apps/ui-lab`：Seekwd UI 的可交互设计原型，部分操作使用内存 Mock。
- `apps/workbench`：独立的 React/Vite 产品前端入口，提供 MVP 级 Workspace、Canvas、节点/连接编辑、Revision 保存和 Run 操作；图数据来自 Host 快照或本地适配器。
- `crates/pong-core`、`crates/pong-host`：本地 Rust Host 的最小模型和 HTTP 接口。Host 使用 SQLite 保存快照、Run 幂等日志和快照更新游标。

Workbench 默认使用浏览器 `localStorage` 适配器。开发时可通过同源 Vite 代理连接本地 Host；token 仅保存在开发服务器环境变量中，不写进 `VITE_*` 前端资源。MVP 画布流程为：创建 Canvas（自动生成 Start 节点）→添加 task 节点→连接相邻节点→保存 Revision→Run；Host 的 Run 仍是约 1.6 秒的模拟完成，不执行节点、文件操作或测试；尚无真实 Worker、LocalRestricted 沙箱或 Tauri 桌面壳。此开发 HTTP 边界不是正式的本机用户会话或受保护 IPC，不可据此开放任意执行能力。

## 本地开发

```powershell
pnpm install
pnpm dev
```

`pnpm dev` 启动 UI Lab。正式前端的纵向原型可以单独运行：

在两个 PowerShell 终端设置**相同的随机 token**（例如先生成 32 字节随机值，再将值分别赋给两个终端的 `PONG_HOST_TOKEN`；不要提交、打印或放入 `VITE_*` 变量）：

```powershell
# 终端 1：Host
$env:PONG_HOST_TOKEN = "<64 位十六进制随机值>"
$env:PONG_HOST_ALLOWED_ORIGIN = "http://127.0.0.1:4174"
cargo run -p pong-host

# 终端 2：Workbench 开发代理
$env:PONG_HOST_TOKEN = "<同一个随机值>"
$env:VITE_HOST_PROXY = "1"
pnpm dev:workbench
```

随机值可在可信的 PowerShell 会话中用 `[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))` 生成。Workbench 固定在 `127.0.0.1:4174`，Host 固定在 `127.0.0.1:4317`；端口占用时会失败而非改用未知端口。未设置 token/允许来源时 Host 拒绝启动。Bearer token、Host authority 和 Origin 都由 Host 检查；CORS 只限制浏览器读取，不是认证。无 Origin 的本地命令行客户端仍须持有 token。Vite 代理只能用于受控开发，不能抵御同一用户下能访问本机开发服务的恶意进程；正式发行需要绑定本机用户和客户端实例的受保护 IPC/Session。

Host 会按 `PONG_HOST_DB` 路径持有跨平台独占的 `.lock` sidecar；同一数据库第二次启动会失败，不会启动两个互相覆盖快照的 Host。锁由操作系统句柄管理，进程崩溃后残留的 sidecar 不会永久阻塞下一次启动。收到 Ctrl+C 后 Host 停止接收新连接并优雅退出，正在处理的请求完成后释放数据库和实例锁。

Host 默认在当前目录创建 `pong-host.sqlite3`；可用 `PONG_HOST_DB` 指定本地测试数据库。不要将开发服务暴露给其他设备或不可信网页。

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
