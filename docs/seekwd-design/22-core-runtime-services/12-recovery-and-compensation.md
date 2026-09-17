# 恢复、孤儿处理与补偿

## 故障模型

必须假设会发生：进程崩溃、设备休眠、网络断开、消息重复、存储半提交、执行器消失、授权过期、用户关闭 UI、外部动作结果未知和版本变更。

## 恢复流程

```text
load durable run facts
  -> rebuild state projection
  -> validate graph / policy / grants still usable
  -> inspect in-flight execution handles
  -> reconcile external state where possible
  -> classify each NodeRun
  -> resume, retry, compensate, wait or request human
```

恢复时不得因为缺少内存状态就把 in-flight 动作当作失败或未开始。

## 孤儿执行

当 Harness 找不到或无法确认一个外部执行句柄时，NodeRun 进入 `orphaned` 或 `outcome_unknown`，停止下游副作用。系统尝试重新查询、等待、补偿或人工确认；只有结果被证实后才能继续。

## 补偿

每个有副作用节点可声明：

```text
none                 不可补偿
automatic            有安全的补偿节点
manual               需要人工处理
best_effort          尝试补偿但可能失败
```

补偿本身也是节点运行，有输入、输出、错误和证据。补偿成功不等于回到了“从未执行”的状态，审计必须保留原动作。

## Saga 边界

跨多个可独立提交的动作使用 Saga，而不是假设分布式原子事务。每一步定义确认点、补偿、不可逆点和停止策略。达到不可逆点后，修复策略转为前向修复或人工决策。

