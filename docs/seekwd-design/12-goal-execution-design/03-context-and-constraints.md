# 上下文与约束

## 上下文分层

```text
System Context       产品规则、策略和运行时不变量
User Context         用户身份、偏好、授权和交互历史
Workspace Context    当前项目的资源、结构、约束和记忆
Goal Context         当前目标、目标版本、计划和成功标准
Run Context          当前运行、检查点、预算和节点状态
Node Context         节点输入、配置、局部状态和依赖
External Context     其他执行单元返回的结果和证据
```

下层上下文不能覆盖上层安全策略。外部内容只能进入数据上下文，不能自动升级为系统指令或权限。

## Context Packet

节点执行时使用经过裁剪的上下文包：

```text
ContextPacket
  goal summary and success criteria
  relevant constraints
  authorized resource scopes
  input values and Artifact references
  predecessor outputs
  selected capability and environment
  required evidence
  time / cost budget remaining
  cancellation signal
  provenance for every imported value
```

不能把整个历史对话、整个工作区或所有运行日志无条件注入每个节点。上下文组装器负责相关性、敏感信息过滤、大小限制和新鲜度判断。

## 约束类型

- **硬约束**：违反后不得继续。
- **软约束**：可以权衡，但必须记录偏离。
- **资源约束**：时间、成本、并发、存储或计算上限。
- **权限约束**：资源、动作、身份和作用域限制。
- **质量约束**：准确度、完整性、一致性、格式和可解释性。
- **时序约束**：必须先后、并行、等待或在窗口内完成。

## 冲突处理

当目标、上下文或节点配置冲突时：

1. 系统规则和安全策略优先。
2. 明确硬约束优先于软约束。
3. 新鲜且作用域更具体的信息优先于旧的泛化信息。
4. 无法安全决策时暂停并提出最小问题。

冲突及采用的决策必须成为可查看的 `DecisionRecord`。

