# 命令、事件与投影恢复合同

> 状态：Normative Contract

## 事实边界

- 命令表达意图，不是已经发生的事实。
- 事件表达已提交事实，不是 UI 请求或临时进度提示。
- 查询快照是某个游标处的可重建投影，不是新的事实来源。
- Workbench、Agent、Worker 和扩展不得直接修改投影或数据库表绕过命令处理器。

## CommandEnvelope

```text
CommandEnvelope<T> {
  commandId: Id
  protocolVersion: SemVer
  commandType: string
  aggregateRef: AggregateRef
  expectedAggregateVersion?: uint64
  idempotencyKey: string
  principal: PrincipalRef
  authoritySnapshotRef?: Id
  correlationId: Id
  causationId?: Id
  submittedAt: Timestamp
  deadline?: Timestamp
  payload: T
}
```

命令处理必须先认证、去重、检查版本与策略，再原子提交事实和 Outbox。`accepted` 只代表命令已进入处理或已经提交，不代表异步动作已经成功。

## EventEnvelope

```text
EventEnvelope<T> {
  eventId: Id
  protocolVersion: SemVer
  eventType: string
  aggregateRef: AggregateRef
  aggregateSequence: uint64
  globalPosition: uint64
  correlationId: Id
  causationId?: Id
  actor: PrincipalRef
  occurredAt: Timestamp
  payload: T
  payloadDigest: Digest
}
```

同一聚合的 `aggregateSequence` 必须连续单调；`globalPosition` 只用于恢复游标，不承诺不同聚合间的业务因果顺序。

## 订阅和去重

```text
SubscriptionRequest {
  consumerId: Id
  afterGlobalPosition: uint64
  filters?: EventFilter[]
  maxBatchSize: uint32
}

EventFilter {
  eventTypes?: string[]
  aggregateTypes?: string[]
  aggregateIds?: Id[]
  condition?: ConditionExpression
}

ProjectionCheckpoint {
  consumerId: Id
  lastAppliedGlobalPosition: uint64
  projectionVersion: SemVer
  updatedAt: Timestamp
}
```

- 投递保证为至少一次。
- 消费者必须以 `(consumerId, eventId)` 去重。
- 应用事件和推进 Checkpoint 必须在同一事务内完成，或使用等价 Inbox 事务。
- 收到旧事件时忽略但保留审计；发现序列缺口时停止该聚合更新并触发重同步。
- 未知事件类型不能被映射成成功状态；读取方必须保留游标并请求兼容处理或升级。

## 快照与重同步

```text
ProjectionSnapshot<T> {
  snapshotId: Id
  projectionType: string
  projectionVersion: SemVer
  coveredThroughGlobalPosition: uint64
  generatedAt: Timestamp
  payload: T
  payloadDigest: Digest
}
```

恢复流程固定为：

```text
disconnect detected
 -> stop optimistic fact updates
 -> reconnect and authenticate Host instance
 -> request events after local cursor
 -> if cursor retained and sequence complete: replay
 -> otherwise fetch compatible snapshot
 -> verify digest and replace projection atomically
 -> replay events after snapshot position
 -> mark UI synchronized
```

UI 在同步完成前必须显示最后确认时间，并禁止把离线命令显示为已执行。允许离线编辑 Draft 时，离线命令进入独立 Pending Command Log，重连后必须执行版本冲突检查。

## 崩溃恢复

Host 启动时必须：

1. 验证数据库迁移、事件日志和 Outbox/Inbox 一致性。
2. 找出非终态 Run、NodeRun、ExecutionHandle、Approval 和 WaitRecord。
3. 对纯内部等待恢复订阅和截止时间。
4. 对外部执行句柄先进入 `reconciling` 或 `orphaned`，不得直接重试。
5. 对未确认命令依据幂等键查询原结果，不得重复产生副作用。
6. 完成事实恢复后才允许新的高风险调度。

## 投影重建与升级

- 任意投影必须能从事件日志和必要的不可变对象重建。
- 投影 Schema 升级必须使用新 `projectionVersion`，失败时保留旧投影并进入只读恢复模式。
- 事件迁移不得改写历史业务含义；需要纠正事实时追加补正事件。
- 事件保留、压缩或归档不得破坏活动 Run、审计链、Lineage 和重建所需的最小事实。

## 必需故障测试

- 命令响应丢失后用同一幂等键重试。
- 事件重复、乱序、批次中断和游标过期。
- 子 Run 完成事件已提交但父投影离线。
- Host 在写入事实后、发送响应前崩溃。
- Worker 失联且外部动作结果未知。
- Snapshot 校验失败、投影版本不兼容和数据库迁移失败。
