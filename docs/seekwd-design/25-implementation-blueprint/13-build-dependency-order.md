# 实施依赖顺序

这是依赖顺序，不是产品分期承诺。后续开发可以并行，但不能跳过前置契约。

## 1. 可持久化核心

```text
Core value objects
Schema validation
SQLite migrations and Event Store
Artifact metadata and content store
Policy Decision model
```

## 2. 图语言和标准节点

```text
Canvas / Node / Port / Edge model
Graph validation
Canvas versions and GraphPatch
standard node manifests
```

## 3. 运行与执行

```text
Run / NodeRun state machines
Scheduler and dependency index
Executor Contract and local worker
checkpoint / cancellation / retry / recovery
```

## 4. Host 与客户端

```text
single-instance Host
IPC command / query / subscription
Workbench shell
Canvas Graph Adapter and Inspector
Run, evidence, approval and debug panels
```

## 5. Agent 和扩展

```text
AgentInvocation and structured proposals
Capability discovery / binding
extension manifest / lifecycle / SDK
human-agent handoff
```

## 6. 强化

```text
advanced isolation
network / remote boundaries
skill publication
upgrade / backup / fault recovery
performance / accessibility / security hardening
```

每一层的实现都要满足对应规范的 Definition of Done，不能靠后续“补一下”修复事实、版本、权限或恢复基础。

