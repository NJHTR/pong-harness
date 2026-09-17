# 观察、日志与调试节点

## `observe.log`

写入结构化 LogEvent。日志包含级别、消息模板、字段、关联 ID、主体和敏感度。日志不能成为唯一业务输出或控制信号。

## `observe.capture`

将声明范围内的状态、值、资源或外部回执保存为 Observation 和可选 Artifact。必须标记来源、新鲜度、可信度和访问控制。

## `debug.breakpoint`

在节点前、节点后、条件满足或错误出现时暂停 Run。断点是运行控制配置，不影响生产图的业务语义；发布版本中的调试断点默认禁用。

## `debug.inspect`

读取 NodeRun 输入、输出、端口值、映射、事件、日志、策略决定和证据。Inspect 默认只读，不允许通过调试入口修改事实。

## `debug.replay`

使用历史输入、Artifact revision 和精确版本创建 Debug Run 或 Run Branch。必须标记重放来源、是否隔离副作用、与原 Run 的差异和结果比较。

## 调试安全

调试不能绕过权限、秘密保护、审批和预算。能查看某个节点状态不等于能访问其完整输入内容。

