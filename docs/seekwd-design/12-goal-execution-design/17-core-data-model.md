# 核心数据模型

本文件定义 Pong Harness 的概念实体和关系，不绑定数据库或编程语言。

## 目标域

```text
Goal
  1 --- n GoalVersion
  1 --- n Objective
  1 --- n GoalEvent

GoalVersion
  1 --- n Constraint
  1 --- n SuccessCriterion
  1 --- n Assumption
  1 --- n Plan
```

### Goal

稳定身份和生命周期容器。它不直接保存会变化的目标文本、约束或成功标准；这些保存在不可变 `GoalVersion` 中。

### Objective

目标的可验证中间结果。`Objective` 可以构成 DAG，支持多个父目标和多个消费者；每个 Objective 至少有一个验证器。

### Constraint / Assumption / SuccessCriterion

都必须有：来源、优先级、作用域、状态、创建时间、失效条件和可追溯引用。

## 能力域

```text
Capability
  1 --- n CapabilityVersion
  1 --- n CapabilityEvidence
  1 --- n CapabilityBinding

CapabilityNeed
  n --- n CapabilityCandidate
```

### CapabilityVersion

不可变实现契约，包含输入输出、配置、运行需求、权限需求、质量声明、信任等级和验证引用。

### CapabilityBinding

把图中一个节点实例绑定到某个能力版本及其选定执行上下文。绑定记录选择理由和替代候选，以便失败时重新匹配。

## 图域

```text
Canvas
  1 --- n CanvasVersion
CanvasVersion
  1 --- n GraphNode
  1 --- n GraphEdge
  1 --- n GraphPolicy

GraphNode
  n --- 1 CapabilityVersion
GraphEdge
  source GraphNode --- target GraphNode
```

### GraphNode

节点实例有稳定 ID，但配置随 CanvasVersion 固化。节点包含端口映射、显示元数据、启用状态、失败策略和可见性策略。内部节点可属于复合节点或 Agent 节点的私有子图。

### GraphEdge

边类型为数据、控制、事件、等待、条件或补偿。每条边有映射表达式、条件、超时、取消传播和溯源策略。

### GraphPatch

由 Patch Header 和一组原子操作构成。原子操作必须定义前置版本、目标对象、变更前摘要、变更后摘要和可逆性。应用后产生新的 CanvasVersion 或 RunPatch。

## 运行域

```text
Run
  1 --- n NodeRun
  1 --- n Checkpoint
  1 --- n RunEvent
  1 --- n ApprovalRequest
  1 --- n Observation
  1 --- n Artifact

NodeRun
  n --- n Artifact (input / output / log)
  n --- n Evidence
```

### Run

运行固定引用 GoalVersion、CanvasVersion、策略版本和起始输入。父子 Run 使用 correlation 和 parent 关系，而非把所有数据复制到子运行。

### NodeRun

NodeRun 是最小审计单位。它保存状态机位置、输入快照、输出引用、所用 CapabilityBinding、执行上下文摘要、重试链、取消句柄和验证结果。

### Checkpoint

检查点只保存能恢复运行所需的信息。大内容使用 Artifact 引用，敏感上下文必须按保留策略加密、脱敏或不保存。

## 证据与产物域

```text
Artifact
  1 --- n ArtifactRevision
Evidence
  n --- n ArtifactRevision
VerificationReport
  n --- n Evidence
DeliveryManifest
  n --- n ArtifactRevision
```

Artifact 的稳定身份和内容版本分开，以支持同一个逻辑资源在运行中多次修改。Evidence 引用某个具体 revision，避免“后来文件变了但旧结论还指向它”的问题。

## 权限域

```text
Policy
  1 --- n PermissionRule
PermissionDecision
  n --- 1 Run
  n --- 1 NodeRun
ApprovalRequest
  0..1 --- 1 PermissionDecision
```

每个 PermissionDecision 都绑定到动作摘要、资源范围、配置哈希、图版本、运行和有效期。不能以“已批准”这种无范围状态取代具体授权。

## 必须建立的索引

```text
by goal / goal version
by canvas / canvas version
by run / correlation / parent run
by node run status
by artifact lineage
by capability and trust level
by permission decision and expiry
by verification outcome
```

