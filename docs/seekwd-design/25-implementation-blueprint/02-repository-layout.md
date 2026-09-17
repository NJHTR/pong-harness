# 项目目录

参考仓库结构：

```text
seekwd/
  apps/
    workbench/              React + Vite 桌面前端
  crates/
    pong-host/               Tauri 宿主与本地 IPC
    pong-core/               领域模型、命令、事件和服务
    pong-runtime/            调度器、Run、检查点和恢复
    pong-policy/             权限、审批和策略
    pong-artifact/           Artifact、血缘和内容存储
    pong-agent/              Agent 协议、Planner 和 GraphPatch
    pong-extension/          扩展发现、Manifest 和生命周期
    pong-worker/             子进程 worker 与执行器桥接
  packages/
    graph-schema/            前端和扩展共享的 Graph / Port Schema
    protocol-schema/         Command / Event / Error Schema
    node-sdk/                扩展开发 SDK
    test-fixtures/            脱敏图、运行和 Artifact 样本
  extensions/
    standard-nodes/          标准节点实现和 Manifest
  migrations/
    sqlite/                  有序、幂等、可检查迁移
  tests/
    contract/                契约测试
    property/                图和状态属性测试
    e2e/                     Workbench / Host E2E
  docs/
    seekwd-design/           设计规范
```

## 依赖规则

```text
Workbench -> protocol-schema / graph-schema
pong-host -> pong-core / pong-runtime / pong-policy / pong-artifact
pong-runtime -> core contracts, never UI
extensions -> node-sdk / protocol-schema, never private core storage
```

所有 crate 和 package 都有明确公开 API；私有模块不能被其他边界直接导入。

## 共享类型

共享 Schema 生成 TypeScript 和 Rust 类型，但生成类型只是传输结构。领域不变量仍由 Core Service 校验，不能因为编译器接受就认为数据合法。

