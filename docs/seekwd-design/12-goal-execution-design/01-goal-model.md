# 目标模型

## 目标不是一句提示词

用户输入的自然语言只是目标的原始表达。系统需要把它规范化为一个可以规划、执行和验证的 `GoalRequest`。

```text
GoalRequest
  id
  originalStatement       用户原话，永不覆盖
  normalizedIntent        系统对目标的当前理解
  deliverables             预期交付物及格式
  successCriteria          完成判定
  constraints              必须遵守的约束
  preferences              用户偏好，不等于硬约束
  availableResources       可使用的资源作用域
  authority                可执行的权限范围
  timeBudget / costBudget  时间、计算和费用上限
  riskTolerance            用户允许的风险等级
  deadline                 截止时间
  clarificationPolicy      信息不足时如何提问
  parentGoalId             父目标
  status
  createdAt / updatedAt
```

## 四种信息要分开

- **目标**：必须达到的结果。
- **约束**：不能违反的条件。
- **偏好**：尽量满足的选择。
- **假设**：系统暂时采用、但仍需验证的前提。

例如用户的表达不完整时，系统不能把推测直接写入目标约束；推测必须标记为假设，并在高风险情况下请求确认。

## 成功标准

成功标准必须尽可能转化为可验证谓词：

```text
结果存在
结果结构符合契约
内容满足质量阈值
操作产生预期状态变化
测试或检查全部通过
用户明确确认
```

每个标准声明：验证方法、所需证据、阈值、失败后的处理方式和是否为阻塞条件。没有任何可验证标准的目标只能处于 `needs_clarification`，不能直接标记成功。

## 目标图

目标不是只有树。拆解阶段使用目标树，执行阶段使用带条件、事件和等待关系的有向图：

```text
Goal
  -> Objective
      -> Task
          -> Action
          -> Verification
          -> Decision
          -> Wait
```

一个子目标可以被多个上层目标复用，一个任务也可能依赖多个前置结果，因此最终必须支持 DAG 和显式循环。

## 目标不变量

1. 每个运行都能追溯到一个明确的目标版本。
2. 每个可交付物都能追溯到产生它的节点运行和输入。
3. 每个成功结论都有证据或人工确认。
4. 目标、约束、权限、预算和停止条件在运行中可见。
5. 目标被修改后产生新版本，不覆盖已经运行过的目标。

