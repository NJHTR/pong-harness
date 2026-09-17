# 能力发现、匹配与构造

## 能力是抽象契约

Agent 不应寻找某个固定名称，而应声明需要完成的能力契约：

```text
CapabilityNeed
  objective
  accepted input types
  required output types
  quality threshold
  interaction style: synchronous / streaming / asynchronous
  required observations
  authority scope
  environment constraints
  time / cost budget
  trust minimum
```

## 能力来源

能力可以来自：

- 已验证的节点定义。
- 当前工作区或当前运行中已有的复合节点。
- 外部执行单元或服务。
- 用户提供的资源、线索或人工操作。
- Agent 动态组合现有能力。
- Agent 在受控环境中构造的新实现。

核心系统只依赖 `CapabilityDescriptor`，不依赖某个厂商、应用或协议。

## 匹配流程

```text
目标需求
  -> 生成 CapabilityNeed
  -> 发现候选
  -> 静态检查输入输出兼容性
  -> 过滤权限、环境和信任不满足者
  -> 评估质量、成本、时延和可取消性
  -> 选择候选或提出多个方案
  -> 低风险探测
  -> 写入选择理由和证据
```

选择不是永久绑定。运行中出现失败、成本超限或证据不足时，可以重新匹配。

## 能力缺口

能力缺口不是异常字符串，而是结构化对象：

```text
CapabilityGap
  missing contract
  why it is required
  impact if unresolved
  possible alternatives
  can construct locally
  required permissions
  estimated effort
```

处理顺序由风险和目标决定：替代、委派、询问用户、构造、降低目标或停止。

## 构造新能力

构造流程必须经历：

```text
定义契约
  -> 选择实现策略
  -> 生成或组合实现
  -> 声明依赖、权限和环境
  -> 生成验证样本
  -> 受控执行
  -> 质量评估
  -> 修复或淘汰
  -> 发布临时 / 实验 / 已验证版本
```

新能力默认只对当前运行可见，除非通过发布流程成为工作区能力。发布时要删除敏感数据并生成回归测试。

