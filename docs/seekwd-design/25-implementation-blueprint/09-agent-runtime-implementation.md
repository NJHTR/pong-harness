# Agent 运行时实现

## Agent Loop

```text
load Goal / Context Packet
  -> choose observation need
  -> request capability or action
  -> collect result / evidence
  -> update working state
  -> propose plan or GraphPatch
  -> policy / human decision
  -> continue or finish
```

## 模型适配层

模型调用封装为 `ModelAdapter`，只负责输入、流、结构化输出、取消和用量。它不能直接创建 NodeRun、修改 Graph 或读取秘密。

## 结构化输出

模型输出先进入 Parser / Validator：

```text
raw model output
  -> schema parse
  -> semantic validation
  -> safety / authority validation
  -> proposal object
```

解析失败进入 repair 或 human clarification，不把自然语言猜测成有效命令。

## 规划预算

Agent Invocation 记录轮数、模型调用、输入输出大小、时间、能力调用次数、GraphPatch 数量和无进展次数。任一预算耗尽进入 waiting 或 failed，不自动扩大预算。

## 工作记忆

Agent 的临时思考状态只保留结构化目标、观察、决策、待办和证据引用。长文本、秘密和无关历史不默认放入下一轮上下文。

## Agent 失败

Agent 可能输出无效计划、重复操作、互相冲突补丁、无法验证的成功或超出权限的动作。所有情况由 Harness Schema、Policy、静态 Graph 校验和预算保护拦截。

