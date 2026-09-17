# 画布与组合模型

## 画布定义

画布是带有输入、输出、事件入口和版本的模块，不只是一个 UI 页面：

```text
CanvasDefinition
  public inputs / outputs / events
  internal graph
  permissions and environment policy
  version
```

运行时执行冻结版本，Agent 的后续修改生成新版本或本次运行补丁。

## 画布层级

- 主任务画布：承载用户目标。
- 子画布：实现可复用能力。
- Agent 内部画布：展示某个 Agent 的计划和工具调用。
- 能力实验画布：没有现成能力时用于造轮子、测试和发布。
- 触发器画布：监听外部事件并启动任务。

## 跨画布关系

```text
Canvas Call      调用并等待结果
Canvas Trigger   启动目标但不等待
Event Publish    发布事件
Event Wait       等待事件
Data Bind        映射数据到目标输入
Run Join         等待多个运行汇聚
```

每次跨画布调用保存 `correlationId`、`parentRunId`、源/目标版本、输入输出映射、超时、重试、幂等键和取消传播策略。

跨画布循环必须显式经过循环、等待或事件节点，系统要检测隐式循环依赖。

## 粗粒度到细粒度

Agent 可以先创建一个高层目标节点；当用户需要控制时，再展开为探索、设计、执行、验证和修复等更细的节点。稳定后可重新封装为版本化复合节点。展开和封装不应破坏历史运行记录。
