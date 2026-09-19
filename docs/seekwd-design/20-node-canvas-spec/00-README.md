# 节点与画布正式规范

> 兼容说明：本文档目录保留节点图语言的概念和历史章节。跨组件合同以 [../27-normative-contracts/](../27-normative-contracts/00-README.md) 为准；其中 `CanvasVersion`、单一入口、旧状态和旧 GraphPatch 结构不得直接作为 SDK/API 合同。

本目录定义 Pong Harness 的节点图语言。它规定“什么是画布、什么是节点、什么可以连接、何时可以运行、如何展开、如何版本化和如何调试”，但不绑定某个前端框架、数据库、模型或执行技术。

## 核心定义

```text
Canvas     可调用、可版本化、可执行的图模块
Node       图中的最小可调度行为单元
Port       节点或画布与外界交换值、控制或事件的契约
Edge       两个端口之间的显式关系
Graph      某个画布版本内的节点、端口、边和策略集合
Run        一个冻结图版本的一次具体执行
Artifact   传递、保存或交付的有血缘资源
```

## 阅读顺序

| 文件 | 内容 |
| --- | --- |
| [01-conceptual-layers.md](01-conceptual-layers.md) | 定义、实例、版本和运行的层次 |
| [02-canvas-contract.md](02-canvas-contract.md) | 画布的正式定义、接口和生命周期 |
| [03-node-contract.md](03-node-contract.md) | 节点的正式定义、分类和执行契约 |
| [04-ports-and-values.md](04-ports-and-values.md) | 端口、值、数据类型、流和 Artifact |
| [05-edges-and-routing.md](05-edges-and-routing.md) | 数据、控制、事件、等待和补偿边 |
| [06-composite-and-nesting.md](06-composite-and-nesting.md) | 复合节点、子图、展开与封装 |
| [07-editing-and-collaboration.md](07-editing-and-collaboration.md) | 人类与 Agent 的编辑操作和冲突规则 |
| [08-execution-semantics.md](08-execution-semantics.md) | 图编译、节点触发、状态和重放语义 |
| [09-versioning-and-persistence.md](09-versioning-and-persistence.md) | 草稿、发布、迁移、持久化和历史 |
| [10-editor-and-debugging.md](10-editor-and-debugging.md) | 画布编辑、运行观察和调试交互 |
| [11-invariants-and-acceptance.md](11-invariants-and-acceptance.md) | 系统不变量、校验和验收条件 |
| [12-canonical-schema.md](12-canonical-schema.md) | 框架无关的规范化数据结构 |

## 规范地位

本目录是后续实现中节点、画布、图补丁、运行记录和 UI 的共同依据。发生冲突时，先修改规范和决策记录，再修改实现；不要通过单个页面的临时状态重新定义图语义。
