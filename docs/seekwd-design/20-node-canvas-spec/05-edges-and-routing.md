# 边、路由与依赖语义

## EdgeContract

```text
edgeId
source node and port
target node and port
edge kind
mapping expression
condition
delivery policy
timeout
retry / deduplication policy
cancellation propagation
enabled state
```

每条边都必须明确一种主语义。不要用一条“万能连线”同时承担数据、顺序、事件和错误处理。

## 边类型

### Data Edge

将源 Data Port 的 ValueEnvelope 映射到目标输入。数据边默认不代表“源执行成功后马上运行目标”；目标是否运行还取决于其控制依赖和输入可用性。

### Control Edge

表达前置节点的终态关系，例如 `on_success`、`on_failure`、`on_cancelled`、`on_skipped`。控制边不应依赖页面上的节点上下位置。

### Condition Edge

在源结果满足条件时启用目标路径。条件必须是可审计的纯表达式，读取的值、求值结果和版本都写入 Run Event。

### Event Edge

订阅源事件并将 EventEnvelope 投递给目标。事件边需要去重键、保留窗口、重放策略和订阅生命周期。

### Wait Edge

表示目标必须等待源的某个状态、值或外部确认。Wait Edge 必须有超时、取消和超时后的分支；没有这些约束的等待不允许发布。

### Error / Compensation Edge

失败或撤销时触发诊断、补偿或人工处理。补偿不是自动回滚的同义词，它必须由节点定义明确副作用和可逆性。

## 映射表达式

映射表达式只能完成受限、纯粹的数据选择和转换：

```text
select source fields
rename fields
construct structured values
filter / map collections within declared limits
attach provenance
```

映射表达式不能访问未声明资源、调用有副作用能力、读取全局状态或改变图。复杂转换应成为独立节点，方便调试、缓存和重试。

## 路由决策

条件、路由和分支节点必须输出 `DecisionRecord`：

```text
decision id
criterion version
inputs considered
outcome
evidence
confidence when applicable
selected edges
rejected edges
```

这样用户可以解释为什么某条路径没有运行。

## 循环

图默认是 DAG。循环只能通过显式 Loop Node 或 Event Feedback Node 建立，并要求：

```text
entry condition
exit condition
maximum iterations or time
iteration state schema
retry distinction
cancel behavior
```

普通 Edge 形成的隐式循环必须在静态检查阶段拒绝。

## 边失效

断开、禁用或替换边会改变下游可达性。编辑器必须立即标记失去必需输入、失去终止路径或不再可验证的节点；发布前这些错误必须全部解决或明确设置为未启用路径。

