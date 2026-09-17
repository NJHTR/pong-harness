# 测试与持续集成

## Rust 测试

```text
unit            值对象、状态机、Schema、表达式和策略
integration     SQLite、Artifact、Runtime、Worker、恢复和 IPC
property        随机图、事件、重试、取消和 Patch 不变量
fault injection 崩溃、乱序、重复、断线、超时和存储失败
```

## 前端测试

```text
component       节点检查器、端口、审批和状态呈现
store           草稿、订阅、冲突和离线命令
canvas          Graph Adapter、连接校验和嵌套导航
e2e             Workbench + Host 的真实命令和恢复路径
```

## 契约测试

每个标准节点、扩展、执行器、IPC 消息、事件和画布接口均运行契约测试。SDK 提供测试 harness，Host 在扩展安装或升级时验证所需契约。

## CI 门槛

```text
format and lint
type checks
unit and integration tests
property tests
security dependency scan
migration forward test
extension compatibility test
desktop E2E smoke test
artifact and audit leak checks
```

## 发布前演练

必须在可控环境中模拟 Host 崩溃、Worker 崩溃、网络丢失、审批撤销、升级中断、Artifact 写入失败和外部结果未知。通过标准是恢复路径可解释、不会重复副作用、不会丢失事实。

