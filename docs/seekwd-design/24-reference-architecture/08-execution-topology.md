# 执行拓扑

## 执行上下文分层

```text
control context     Host 内的目标、图、策略和调度逻辑
task context        一个 NodeRun 的执行边界
isolated context    受限资源、进程和依赖的执行空间
external context    由外部主体管理的执行空间
```

节点只能看到 ExecutionEnvelope 声明的输入、资源、工具和预算。

## 队列

队列按目标、画布、能力、优先级和资源进行调度。队列中的项目是 NodeRun 或 Operation Handle，不是任意闭包。排队、租约、超时、抢占和重试都有持久化状态。

## 资源分配

调度器先请求 Context Resolver 预留资源，再调用 Executor Gateway。资源预留失败进入等待或重规划；执行结束后无论成功、失败还是取消都要释放。

## 隔离级别

每个 NodeDefinition 声明所需隔离级别；策略可以提升隔离，不能降低系统最低级别。高风险或未知实现默认进入更强隔离或人工审批。

## 长运行

长运行节点由 Host 或后台 Worker 持有，不能依赖 Workbench 页面存活。Worker 定期上报心跳和检查点；失联后进入对账或孤儿处理，不自动重新产生副作用。

## 资源优先级

用户主动运行、恢复、修复、后台技能验证和低优先级预取可以有不同优先级，但不能让低优先级任务绕过预算、权限或公平性限制。

