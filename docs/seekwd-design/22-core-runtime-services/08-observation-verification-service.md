# 观察与验证服务

## Observation Service

负责接收执行器、外部系统、人工和 Agent 产生的观察，统一来源、时间、作用域、新鲜度、可信度和完整性。观察不等于结论。

## Verification Service

负责把 GoalVersion 或 NodeDefinitionVersion 的 SuccessCriterion 与 Evidence 关联，生成：

```text
VerificationReport
  criterion results
  passed / failed / unknown
  evidence refs
  validator version
  confidence and limitations
  blocking decision
```

## Unknown 状态

验证器无法获取足够证据时必须返回 `unknown`，不能默认通过或失败。编排器可以选择刷新观察、委派验证、请求用户或结束为未完成。

## 验证隔离

验证器应尽量只读输入和证据，不修改被验证结果。需要运行测试或探测外部状态时，将其作为独立 NodeRun 记录。

## 结果提升

节点成功只是局部契约通过；只有目标级 VerificationReport 的阻塞条件全部通过，Run 才能提升为 Goal 成功。人工确认也必须声明确认了哪些标准和依据。

