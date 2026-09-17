# 计划编译为节点图

## 计划与图的关系

Plan 是 Agent 对如何达成目标的可变解释；Graph 是可以被调度器执行、暂停、恢复和审计的具体结构。Plan 可以重新生成，已发布 Graph Version 不可变。

## 图的组成

```text
GraphVersion
  graph id and version
  goal version
  public input / output contracts
  node instances
  data edges
  control edges
  event edges
  wait / join rules
  error paths
  policy references
```

## 编译过程

```text
目标拆解
  -> 任务排序和并发分析
  -> 能力匹配
  -> 生成节点实例
  -> 推导端口和数据映射
  -> 添加验证、等待和错误路径
  -> 添加权限和环境检查
  -> 静态校验
  -> 生成可运行图
```

## 静态校验

运行前必须检查：

- 所有必需输入都有来源或明确的人类输入节点。
- 端口类型和数据映射兼容。
- 节点配置符合 Schema。
- 依赖关系没有隐式循环。
- 等待和触发关系有超时与取消语义。
- 权限和环境需求可以被当前策略满足。
- 所有分支最终都能到达成功、失败、取消或等待状态。
- 预算、并发和资源使用不会无界增长。

## Graph Patch

运行中改变图必须使用补丁：

```text
GraphPatch
  baseGraphVersion
  runId
  operations
  reason
  expectedImpact
  riskLevel
  validationPlan
  authorityDecision
```

操作包括新增、删除、替换、拆分、封装、连接、断开、配置更新、环境绑定和版本提升。补丁要可预览、可拒绝、可回滚，并标记影响到的运行分支。

