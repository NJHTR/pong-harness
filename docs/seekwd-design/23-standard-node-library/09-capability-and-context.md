# 能力与上下文节点

## `capability.discover`

根据 CapabilityNeed 产生候选集合。它只发现和描述，不自动授权或执行。候选必须包含契约、版本、健康状态、信任、成本、可取消性和作用域。

## `capability.resolve`

比较候选并创建 CapabilityBinding。选择理由、过滤原因、备用方案和重选条件都必须保存。

## `capability.construct`

在受控上下文创建临时能力、适配器或复合节点。输出是候选版本和验证计划，不是默认可信的正式能力。

## `context.build`

根据节点需求、策略和可用资源生成 ExecutionContext。上下文必须有资源边界、依赖版本、生命周期、健康状态和清理策略。

## `context.observe`

刷新上下文的状态、可用资源和外部依赖。观察结果有新鲜度；过期上下文不能继续作为已满足条件使用。

## `resource.reserve`

预留时间、并发、计算、存储或外部调用额度。预留失败进入等待或重规划；释放必须幂等。

## 能力替换

替换能力需要检查输入输出契约、质量、成本、权限、环境和结果差异。替代路径必须产生 CapabilityBinding Revision，不能覆盖原绑定。

