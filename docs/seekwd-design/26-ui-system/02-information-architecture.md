# Workbench 信息架构与界面覆盖

> 状态：Provisional Contract  
> 本文定义完整 UI 表面和对象作用域；视觉细节继续由 `00-README.md` 和组件库约束。

## 审计结论

当前 UI 已较完整地设计了工作区侧栏、Canvas、节点、Inspector、Run Output、通知和 Agent Composer，但仍偏重“画布编辑主界面”。一个可开放的 Agent Workbench 还必须让用户看见并处理版本、入口、审批、恢复、权限、环境、产物、事件连接、后台任务和系统健康。否则底层即使实现，用户也没有可信的操作路径。

## 一级外壳

```text
Application Shell
  Global command/search
  New Workspace
  Automations
  Extensions
  Notifications / Attention Center
  Settings

Workspace Shell
  Overview
  Canvases
  Files
  Environments
  Agents & Connections
  Workspace Policies

Canvas Workbench
  Graph
  Inspector
  Agent Composer
  Run Controls
  Context Panels
```

全局命令搜索必须能够按作用域过滤 Workspace、Canvas、Node、Run、Artifact、Approval 和 Setting；搜索结果必须显示对象状态和作用域，不能把同名对象混在一起。命令面板只能提交结构化命令，不能绕过当前权限和审批。

侧边栏只放稳定的范围切换和高频对象。低频管理页面进入 Workspace Overview、Settings 或对象就近面板，避免重新把所有能力平铺到一级导航。

## 页面与面板清单

| 表面 | 作用域 | 主要内容 | 关键动作 | 当前覆盖 |
|---|---|---|---|---|
| Welcome / No Workspace | Global | Recent、创建/打开/恢复 Workspace | 选择目录、恢复会话 | 缺失 |
| Workspace Create / Open | Global | 路径、权限预览、已有配置冲突 | 创建、打开、取消 | 部分 |
| Workspace Recovery | Global/Workspace | 上次崩溃、未提交 Draft、锁和迁移状态 | 恢复、放弃、另存副本 | 缺失 |
| Workspace Overview | Workspace | Canvas、活动 Run、等待事项、资源和健康摘要 | 新建 Canvas、打开 Attention | 缺失 |
| Goal / Task Center | Workspace/Session | 用户原始目标、约束、假设、成功标准、子目标和状态 | 澄清、拆分、批准计划、终止 | 缺失；Agent 目前只有输入框，没有正式目标视图 |
| Plan Review | GoalVersion | PlanCandidate、能力缺口、风险、验证点和待决问题 | 比较、编辑、批准建图、退回 | 缺失；不能只展示自然语言回答 |
| Canvas Graph | Canvas Revision/Draft | 节点、边、入口、触发、选区 | 编辑、运行、保存、布局 | 已有基础 |
| Entrypoints & Triggers | Canvas | 默认/命名入口、schedule/event/API 绑定 | 新增、设默认、禁用、测试 | 缺失 |
| Node Library | Canvas | 标准/扩展/最近节点、兼容性和权限摘要 | 搜索、预览、添加 | 部分 |
| Node Inspector | Node | 配置、端口、权限、环境、版本、验证 | 编辑、测试、替换定义 | 部分 |
| Port & Edge Inspector | Port/Edge | 类型、基数、映射、投递、条件、引用 | 映射、断开、追踪值 | 缺失 |
| Graph Validation | Draft/Revision | 错误、警告、影响和修复建议 | 定位、批量修复、豁免 | 缺失 |
| Save / Revision History | Canvas | Draft 状态、Revision 时间线、Diff | 保存、比较、恢复为 Draft | 缺失 |
| Unsaved Changes / Conflict | Canvas | 本地未提交命令、服务端版本、冲突对象 | 保留本地、载入远端、逐项合并、另存 Draft | 缺失 |
| Release Manager | Canvas | channels、SemVer、兼容性、调用方 | 发布、弃用、撤回 | 缺失 |
| Canvas Import / Export | Workspace/Canvas | Graph、版本、依赖、Secrets 引用、兼容性 | 导入、导出、预览、脱敏 | 缺失 |
| GraphPatch Review | Draft/Run | 原子 diff、风险、权限/预算变化、验证计划 | 批准、拒绝、编辑、应用 | 缺失且阻塞 Agent 改图 |
| Checkpoints / Branches | Canvas/Run | Revision、RunSnapshot、RunBranch、检查点和来源 | 分支、比较、恢复、提升为 GraphPatch | 缺失 |
| Debugger | Debug Run | 断点、单步、暂停点、变量/ValueRef、调用栈和子 Run | 继续、步入、步过、重跑节点 | 缺失；不能用普通日志面板替代 |
| Value & Dataflow Inspector | Port/Edge/NodeRun | 值摘要、Schema、敏感度、Lineage、映射前后和消费方 | 追踪、固定、导出、脱敏预览 | 缺失 |
| Run Launch Sheet | Run | Revision/Release、入口、输入、模式、权限、预算 | 运行、保存预设 | 缺失 |
| Run Monitor | Run | 图上进度、子 Run、等待、成本和关键事件 | 暂停、恢复、取消、接管 | 部分 |
| Run History / Compare | Canvas | Run 时间线、触发来源、终态和验证 | 打开、比较、重放 | 部分 |
| NodeRun Detail | NodeRun/Attempt | 输入、输出、日志、环境、Evidence、重试链 | 重试、分支、诊断 | 缺失 |
| Waiting Input | WaitRecord | 所需字段、上下文、deadline、影响 | 提交、跳过、取消 | 部分 |
| Approval Inbox | Global/Workspace/Run | 权限差异、动作摘要、期限、调用链 | 允许一次/有界、拒绝、撤销 | 缺失 |
| Recovery Center | Workspace/Run | orphaned、cancel_pending、outcome_unknown | 对账、声明结果、补偿、前向修复 | 缺失且阻塞恢复 |
| Cross-Canvas Trace | Workspace Session | 父子 Run、Invocation、值映射和事件 | 跳转、过滤、取消传播 | 缺失 |
| Artifact Browser | Workspace/Run | 文件、报告、Evidence、Lineage、敏感度 | 预览、导出、定位来源、删除 | 缺失 |
| Artifact Delivery | Artifact/Run | 交付目标、格式、权限、过期时间、传输状态 | 下载、复制、发送、撤回 | 缺失 |
| Files | Workspace | 工作区目录、变更、引用、权限状态 | 打开、导入、授权 | 基础导航，内容未定 |
| Environments | Workspace/Global | 发现的本地环境、受控环境、依赖和健康 | 扫描、安装、刷新、删除、绑定 | 缺失 |
| Execution Context Detail | Context | mounts、network、limits、secrets、health | 测试、收紧、停止、清理 | 缺失 |
| Model & Provider Settings | Global/Workspace | 模型供应方、路由、能力、上下文限制、成本和数据边界 | 连接、测试、设默认、禁用 | 缺失；不得与外部 Agent 身份混为一类 |
| Capability Catalog | Global/Workspace | 可用能力、来源、信任、版本、适配器和缺口 | 搜索、探测、绑定、替换 | 缺失 |
| Agents & Connections | Workspace/Global | Provider、能力、身份、健康、信任 | 连接、测试、禁用、撤销 | 缺失 |
| Extensions | Global | 安装源、Manifest、权限、版本和健康 | 安装、升级、禁用、卸载 | 入口有，页面缺失 |
| Node Definition Studio | Workspace/Extension | 自定义节点 Schema、配置、端口、执行器、权限和测试夹具 | 创建、测试、版本化、发布 | 缺失；“万物皆节点”没有用户操作路径 |
| Automations | Global/Workspace | schedule/event Trigger、目标入口、最近执行 | 新增、暂停、测试 | 入口有，页面缺失 |
| Policy & Authority | Workspace | 默认策略、Profile、Grant 和 deny 原因 | 编辑、模拟、撤销 | 缺失 |
| Secrets | Workspace/Global | SecretRef、用途、消费者、到期 | 添加、轮换、撤销 | 缺失；不得展示明文 |
| Usage & Budgets | Global/Workspace/Run | 费用、时间、资源、并发和限制 | 调整上限、查看归因 | 缺失 |
| Audit & Event Explorer | Workspace | command/event/approval/patch 序列和游标 | 筛选、导出、验证摘要 | 缺失 |
| Retention & Storage | Workspace/Settings | 占用、保留、GC 候选、加密状态 | dry-run、清理、导出 | 缺失 |
| Backup / Restore | Global/Workspace | 备份范围、版本、加密、最近验证和恢复点 | 创建、验证、恢复、导出 | 缺失 |
| Migration Center | Global/Workspace | 协议、数据库、Canvas 和扩展迁移状态 | 预检、迁移、回滚、导出诊断 | 缺失；迁移失败不能只显示阻塞弹窗 |
| Notification Center | Global | 完成、失败、等待、审批、恢复 | 打开目标、静音、清除 | 只有 toast，缺持久中心 |
| Host / System Health | Global | Host、Worker、数据库、更新和后台任务 | 重连、诊断、导出支持包 | 缺失 |
| Task Queue / Background Jobs | Global/Workspace | 后台任务、优先级、占用、重试和暂停原因 | 调整、暂停、恢复、取消 | 缺失 |
| Settings | Global | 外观、快捷键、默认执行、隐私、更新 | 配置、重置 | 只有入口 |
| Templates / Presets | Global/Workspace | Canvas 模板、Run 输入、Authority 和环境预设 | 创建、复制、发布、删除 | 缺失 |
| Context & Source Manager | Workspace/Goal/Run | 用户输入、文件、网页、记忆、来源信任和引用范围 | 添加、移除、限制、查看消费方 | 缺失 |
| Data Export Review | Workspace/Run | 即将离开设备或 Workspace 的数据、目标、脱敏和保留 | 批准、拒绝、生成脱敏副本 | 缺失；普通下载确认不能替代 |
| Diagnostics & Support Bundle | Global | 日志范围、系统信息、事件摘要和脱敏预览 | 生成、检查、导出 | 缺失 |

## Canvas 主界面必须补充的元素

### 顶部工具栏

- Draft 保存状态和当前 Revision/Release 标识。
- 默认 `Run` 与 `Run from...` 入口选择。
- Graph Validation 摘要。
- Run History、Cross-Canvas Trace 和上下文面板切换。
- `Add node`、自动布局、缩放/适配和只读/编辑状态。
- 协作者或 Agent 正在编辑时的锁与冲突提示。

### 节点组件

- Header：语义图标、名称、定义版本、运行状态、断点/禁用标记。
- Body：最多展示少量关键配置和摘要，不把完整表单塞入节点。
- Port rails：输入和输出分侧、类型和方向可辨、连接计数、虚拟化的 overflow 入口。
- Footer：环境/权限/缓存/副作用等只显示需要注意的语义图标。
- Entry badges：显示 `Default` 或命名入口引用，不把入口做成越界悬浮图标。
- 1 到 8 个端口直接展示；更多端口分组折叠；数百端口只在 Inspector 虚拟列表中展示。Canvas 节点尺寸不得随端口总数无限增长。

### 画布状态覆盖层

- Loading skeleton，不闪烁旧图。
- Empty canvas，引导通过 Composer 或 Add node 开始。
- Read-only Revision/Release，明确如何 fork 到 Draft。
- Conflict，展示本地/远端差异和可选择合并路径。
- Offline / Host disconnected，禁止伪装命令已成功。
- Host restarting / crashed，展示事实快照时间、未确认命令和恢复动作；不能把旧投影当作当前状态。
- Invalid graph，仍允许编辑但阻止运行并可跳转到问题。
- Debug Run banner，避免把调试 Revision 当成正式 Release。
- Migration required，旧 CanvasVersion 或旧协议对象必须先迁移，不能静默转换后直接运行。
- Permission changed，当前 Grant、Secret 或执行上下文失效时，展示受影响的等待和重新审批入口。

## Attention Center

等待输入、等待审批、冲突、环境缺失、取消待确认和结果未知都属于“需要注意”，但处理方式不同。右上角提供持久 `Attention Center`，按紧急度和 Workspace 聚合：

```text
Critical: outcome_unknown, destructive approval expiring
Action required: waiting_input, waiting_approval, graph conflict
Warning: environment unavailable, budget near limit
Informational: run completed, release published
```

Toast 只负责即时提醒；关闭 Toast 不等于处理事实。侧边栏状态图标和 Attention Center 必须来自同一投影。

## Agent Composer 不是聊天框

底部 Composer 是目标和变更请求的入口，不是事实存储。每次提交必须明确当前作用域：

```text
Global / Workspace / Canvas / Selection / Run / NodeRun
```

系统解析后至少进入一种结构化结果：Goal clarification、Plan proposal、GraphPatch、RunPatch、查询回答或需要审批的命令。界面必须展示 Agent 正在读取的上下文引用、将要影响的对象、权限边界和预计成本；自然语言消息本身不能直接修改图或运行事实。

Composer 还需要覆盖：

- 停止生成只停止当前 Agent 推理，不等于取消已经接受的 Run 或外部动作。
- 切换 Canvas 或 Workspace 时保留会话，但必须重新确认作用域，避免把请求应用到错误对象。
- 附加文件、Artifact、节点或 Run 时使用可移除的结构化引用，不把路径和权限藏在纯文本中。
- Agent 提案和已执行事实视觉上必须分离；提案可编辑，事实只能通过新命令或补丁改变。

## 全局导航与多任务

- Workspace 切换器必须是一级全局操作，支持最近、固定、搜索和打开新窗口；用户开始工作后不能在 Composer 内偷偷切换 Workspace。
- 多个 Workspace 或 Canvas 同时运行时，侧边栏只显示聚合状态；具体等待、失败和完成进入 Attention Center 或对象就近页面。
- Run History 属于 Canvas；跨 Canvas 执行链属于 Cross-Canvas Trace；全局只提供搜索和 Attention 聚合。
- 页面离开前若存在未提交 Draft、待应用 GraphPatch、未发送人工输入或危险确认，必须显示对象化的离开影响，不能统一使用“有未保存内容”。

## 对象状态页面规则

每个管理表面都必须设计以下状态，而不只是正常列表：

| 状态 | 必需表现 |
|---|---|
| Empty | 说明缺少哪类事实，并给出当前权限允许的首个动作 |
| Loading | 保留稳定布局，显示正在读取的作用域和快照时间 |
| Partial | 明确哪些区域不可用，不把部分数据当完整事实 |
| Offline | 显示最后确认游标/时间，区分离线 Draft 与不可发送命令 |
| Permission denied | 展示被拒资源和可申请的最小权限，不建议“开启全部权限” |
| Conflict | 展示版本、对象和可合并差异，危险操作不自动重放 |
| Unsupported | 显示协议/扩展/执行器不兼容和升级路径 |
| Corrupt / recovery-only | 进入只读恢复，提供备份、诊断和迁移动作 |

## 命令交互状态

每个有副作用命令必须呈现：`idle -> pending -> accepted | approval_required | conflict | failed`。`accepted` 只说明 Host 接受命令，不代表动作已经成功；运行结果由事实事件更新。

危险操作先获取服务端 `ImpactAnalysis`，确认框展示真实引用、活动运行和不可逆影响，不能由前端根据当前列表自行猜测。

## 响应式和可访问性

- 窄屏优先把 Inspector 和底部面板变成互斥抽屉；不得压缩节点到不可读。
- 键盘可以遍历节点、端口、边、工具栏、面板和命令菜单。
- 所有状态同时有图标、文本和可访问名称，不只依赖颜色或动画。
- 动画遵守 reduced-motion；持续运行动画不应造成大面积重绘。
- 大图使用节点/边虚拟化、分层细节和聚合，不在 DOM 中同时渲染全部日志或端口。
