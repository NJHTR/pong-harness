# 验证与质量节点

## `verify.assert`

对结构、状态、存在性、范围或关系做确定性断言。输入为 ValueEnvelope、AssertionDefinition 和 Evidence；输出为通过、失败或未知以及结构化差距。

断言失败不能只写日志，必须走 Error 或 Gate 路径。

## `verify.evaluate`

对不能完全由确定性规则判断的标准执行评估。配置必须声明评价标准、输入、评分范围、最小证据、置信度处理、可解释性和是否允许人工复核。

评估输出不是最终事实，而是带证据、限制和版本的 EvaluationReport。

## `verify.gate`

根据一个或多个 VerificationReport 决定放行、阻断、降级、重试、修复或请求人类。Gate 的规则必须在图中可见，不能隐藏在 Agent 提示词中。

## `verify.compare`

比较候选结果、版本或基线。必须声明比较维度、容差、忽略项和结论策略。比较失败可以生成差异 Artifact。

## `verify.human-confirm`

把无法自动判定的成功标准转为 Human Review，并将用户确认关联到明确 criterion 和 Evidence。人工确认不是通用“全都没问题”标记。

## 质量门

质量门是阻塞性 Gate。它声明最低标准、可接受例外、例外审批主体和未通过后的路径。任何 Agent 或节点都不能绕过质量门直接把 Run 标记成功。

