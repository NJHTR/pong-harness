# 测试与契约

## 契约测试

每个节点、能力、执行器和画布接口必须有契约测试：

```text
input schema acceptance
output schema validity
error shape
waiting and resume behavior
cancellation behavior
idempotency behavior
permission enforcement
artifact lineage
version compatibility
```

## 图属性测试

对随机生成的合法和非法图验证：

- 静态校验不会放行断开的必需输入。
- 普通边不会放行隐式循环。
- 调度结果满足依赖和条件。
- 重放不会改变历史事实。
- 取消最终不会产生新的可运行后继。
- GraphPatch 应用和回滚保持图不变量。

## 故障演练

必须测试消息重复、乱序、延迟、进程崩溃、存储部分提交、执行上下文失效、授权撤销、外部句柄过期、流中断和用户在交接中断开连接。

## 回归测试

每次发布节点定义、画布接口、策略或调度器时，运行历史中的关键输入应能作为脱敏回归样本。回归样本记录预期契约和允许的质量范围，而不是强行要求文本逐字相同。

## 可解释性测试

随机抽取成功和失败运行，检查是否可以回答：

```text
目标是什么？
为什么选择这条路径？
每个关键结论的证据是什么？
谁批准并执行了什么？
失败后为什么继续、等待、修复或停止？
最终产物由哪些输入和节点产生？
```

