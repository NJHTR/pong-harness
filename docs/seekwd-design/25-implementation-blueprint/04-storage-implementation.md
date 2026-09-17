# 存储实现

## SQLite 表分组

```text
identity_*          主体、设备、会话和租约
goal_*              Goal、GoalVersion、Constraint、Criterion
canvas_*            Canvas、CanvasDraft、CanvasVersion、Node、Edge
capability_*        Manifest、Version、Binding、Health
run_*               Run、NodeRun、Attempt、Checkpoint、Wait
event_*             追加式事件和游标
artifact_*          Artifact、Revision、Lineage、Delivery
policy_*            Rule、Decision、Approval、Grant、Revocation
memory_*            Memory、Skill、TestCase、Trust
projection_*        可重建查询投影
migration_*         迁移历史和校验
```

## 事件日志

关键状态转移写入 append-only Event Log。事件包含 schema version、序列、hash chain 或等价完整性字段。投影表可删除并从事件重建。

## Artifact Store

内容使用内容寻址或不可变 revision 存储；SQLite 只保存元数据、索引和血缘。写入通过临时对象、校验、原子提交和引用发布完成。

## 事务

同一事实边界使用 SQLite 事务。跨表提交包括事件和状态投影所需的最小索引；大内容写入采用两阶段引用：先准备、后提交。

## 备份

备份包含 SQLite 一致快照、Artifact 元数据和被选中的内容对象。恢复先恢复定义和事件，再恢复 Artifact 引用，最后重建投影和 Run 状态。

## 数据清理

清理程序必须先查询引用、活动 Run、审计保留和用户锁定，再生成删除计划。删除计划本身进入审计，失败可以重试且不会误删其他 revision。

