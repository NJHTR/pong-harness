# Seekwd Notification & Attention Center PRD

> 文档类型：Product Requirements Document  
> 文档状态：Experimental Proposal  
> 目标版本：UI Lab 完整交互版 / 首个受邀试点  
> 负责人：Product / Design / Workbench Frontend / Runtime Projection  
> 最后更新：2026-09-20  
> 相关规范：[UI 系统](00-README.md) · [Mock Data/API](01-mock-data-and-api.md) · [信息架构](02-information-architecture.md) · [统一状态注册表](../27-normative-contracts/04-unified-state-registry.md) · [命令、事件与恢复](../27-normative-contracts/11-command-event-recovery.md)

## 1. 文档目的

本文定义 Seekwd 工作台中的完整通知产品，而不只定义右上角的一张临时提示卡。

通知产品必须解决四个不同问题：

1. **即时反馈**：用户刚执行的操作是否已被接受、完成或失败。
2. **异步提醒**：用户不在当前 Canvas 时，其他 Workspace、Canvas、Run 或 Automation 发生了什么。
3. **待办处理**：审批、人工输入、冲突、恢复和结果未知等事项需要用户后续采取行动。
4. **事实追溯**：用户关闭临时通知后，仍能在持久中心找到事件、目标对象和处理结果。

本 PRD 是产品与交互合同。底层状态、权限、事件和对象身份仍以 `27-normative-contracts` 为准；任何 UI 便捷模型不得覆盖正式领域状态。

## 2. 背景与问题

当前 UI Lab 已存在 macOS 风格的 `Notification` 组件，并支持：

- 从右侧进入和退出；
- 多条消息堆叠；
- 每条消息独立计时；
- 普通消息自动消失；
- 单条手动关闭；
- Extensions、Automations、Files、Environments、Agents 和 Canvas 完成事件触发通知。

但当前实现仍是局部 Mock，尚未解决产品级问题：

- 新消息曾经会直接替换旧消息，用户无法确认自己是否漏掉操作结果。
- 所有消息若使用统一的 5 秒时长，权限说明可能来不及阅读，普通成功消息又可能停留过久。
- Toast 消失后没有持久入口，跨 Workspace 的失败、等待和审批容易丢失。
- “关闭通知”与“完成任务”“解决错误”“拒绝审批”之间缺少明确区分。
- 多个 Run 同时进行时，消息可能高频涌入，造成注意力干扰。
- 应用不在前台、窗口被关闭、系统休眠或 Host 重连后，通知如何恢复尚未冻结。
- 通知缺少稳定深链接，打开后可能跳到错误的 Workspace、Canvas 或 Run。
- Settings 目前只有简单开关，缺少通知类别、免打扰、系统通知和 Workspace 级别策略。

因此，需要把通知从单个组件提升为跨 Workbench、Runtime 和 Host 的产品能力。

## 3. 产品目标

### 3.1 核心目标

- 每一个有意义的异步结果都能被用户看见、定位和追溯。
- 连续产生的新通知彼此独立，不覆盖旧通知，也不让界面无限堆积。
- 不同重要级别拥有不同的停留、声音、系统通知和自动关闭策略。
- 需要用户操作的事项在被明确处理前不会因为 Toast 消失而丢失。
- 点击通知能够恢复完整对象上下文，准确进入 Workspace、Canvas、Run、NodeRun、Approval 或 Recovery 项。
- 通知、侧边栏状态、Attention Center 和对象详情来自同一事实投影。
- 支持多 Workspace、多 Canvas、多个并行 Run 和后台运行。
- 支持键盘、读屏、减少动态效果、减少透明度和高对比度。

### 3.2 成功标准

试点阶段达到以下结果：

- 100% 的 `action_required` 通知可从 Attention Center 重新找到。
- 100% 的通知打开动作携带稳定对象 ID，不依赖当前选中名称。
- 连续触发 10 条通知时，页面不发生横向溢出、布局跳动或旧消息内容被替换。
- 用户关闭 Toast 后，对应 Approval、WaitRecord、Run Error 或 RecoveryCase 仍保持真实状态。
- 断线重连后，同一 `notificationId` 不重复生成多条持久记录。
- 相同批量事件经过聚合后，非关键通知数量至少减少 60%。
- 所有交互可仅使用键盘完成。

## 4. 非目标

首版不实现：

- 邮件、短信、企业微信、Slack 等外部推送渠道。
- 用户自定义任意通知规则表达式。
- 富媒体营销通知。
- 依靠声音区分所有状态。
- 把通知中心作为 Run 日志、Artifact Browser 或 Audit Explorer 的替代品。
- 把自然语言通知文本当作系统事实或恢复依据。
- 对安全敏感操作提供“一键全部允许”。

## 5. 用户与使用场景

### 5.1 主要用户

| 用户 | 特征 | 主要需求 |
|---|---|---|
| 单 Workspace 用户 | 聚焦一个项目，运行数量少 | 操作反馈清楚，不被无关提醒打断 |
| 多 Workspace 用户 | 多个 Workspace 同时运行 | 不离开当前 Canvas 也能知道其他任务状态 |
| 长任务用户 | Run 持续数分钟至数小时 | 应用切后台后仍能收到完成、失败和等待提醒 |
| 审批责任人 | 需要批准权限、数据导出或跨 Workspace 调用 | 看清影响、期限和最小授权范围 |
| 调试与恢复用户 | 处理失败、取消待确认和结果未知 | 快速进入正确 Run/NodeRun/RecoveryCase |
| 扩展管理者 | 安装、升级和审查 Extension | 看清权限、版本、健康和变更结果 |

### 5.2 核心用户故事

1. 当我连续点击 `View permissions` 和 `Open documentation` 时，我希望看到两条独立消息，而不是第二条覆盖第一条。
2. 当普通操作成功时，我希望消息自动消失，不需要逐条关闭。
3. 当通知包含权限信息或较长说明时，我希望它停留更久，足够阅读。
4. 当 Run 在另一个 Canvas 完成时，我希望收到通知，并能点击打开该 Run 的结果。
5. 当 Run 等待输入或审批时，我希望事项保持在 Attention Center，直到我处理或它失效。
6. 当多个节点连续完成时，我希望系统聚合低价值消息，而不是弹出几十条卡片。
7. 当应用离线后恢复时，我希望补齐遗漏的重要通知，但不要重复显示已经看过的消息。
8. 当我关闭失败通知时，我希望失败事实仍显示在 Canvas、Run History 和 Attention Center 中。

## 6. 产品原则

### 6.1 提醒不是事实

Toast 是事实的一个短期投影。关闭 Toast 只改变展示状态，不改变 Run、Approval、WaitRecord、RecoveryCase 或 Extension 的领域状态。

### 6.2 新消息不得覆盖旧消息

每次通知创建都必须获得独立 `notificationId`。UI 根据 ID 新增、更新或移除指定消息，禁止用单例状态替换内容。

### 6.3 重要程度决定打断程度

完成反馈可以自动消失；需要操作的事项必须持久存在；关键安全和结果未知事件可以触发系统通知，但不得滥用声音或弹窗。

### 6.4 提醒必须指向下一步

通知内容必须回答：发生了什么、影响哪个对象、用户是否需要行动、点击后去哪里。不能只显示 `Something went wrong`。

### 6.5 同一事实只有一个处理状态

Toast、Attention Center、侧边栏徽标和对象页面必须共享同一 `notificationId`、`sourceRef` 和领域事实，不建立互相矛盾的本地状态。

### 6.6 控制注意力预算

批量、重复和低价值事件应聚合。只有完成、失败、等待、审批、恢复、权限和用户直接操作反馈可以主动打断。

## 7. 名词定义

| 名词 | 定义 |
|---|---|
| Notification | 面向用户的一条结构化提醒记录，可持久化和追溯 |
| Toast | 工作台右上角的临时通知展示，不是独立事实 |
| Attention Item | 需要用户处理或确认的持久事项 |
| Notification Center | 所有可追溯通知的历史列表 |
| Attention Center | Notification Center 中需要行动的优先视图 |
| Read | 用户已在通知列表中看见该通知 |
| Dismissed | 用户关闭了临时展示或从普通历史列表隐藏，不等于解决来源事实 |
| Resolved | 来源领域事项已完成、取消、过期或被明确处理 |
| Acknowledged | 用户已确认知晓，但事项可能尚未解决 |
| Source | 产生通知的领域对象或事件 |
| Target | 点击通知后打开的稳定页面上下文 |
| Delivery | Toast、Center、系统通知等一次呈现尝试 |

## 8. 信息架构

```text
Workbench
  Top-right Toast Stack
  Global Attention Button
    Attention Center
      Action Required
      Warnings
      Recent Activity
      All Notifications
  Settings
    Notifications
      Categories
      System Notifications
      Quiet Hours
      Workspace Overrides
```

### 8.1 Toast Stack

用于即时、短期、非阻塞反馈。固定在工作台右上角，不占据 Canvas 布局空间。

### 8.2 Attention Center

用于持久处理：

- `waiting_input`
- `waiting_approval`
- `outcome_unknown`
- `orphaned`
- `cancel_pending`
- Graph conflict
- Environment unavailable
- Budget exceeded / near limit
- Extension permission change
- Data export review

### 8.3 Notification Center

用于查看近期完成、失败、配置变更和系统事件。它提供搜索、过滤和对象跳转，但不替代 Audit Explorer。

### 8.4 对象就近状态

- Canvas 行显示该 Canvas 聚合运行状态。
- Run History 显示单 Canvas 执行记录。
- Node 显示 NodeRun 状态。
- Settings 和 Extensions 显示配置结果。
- Attention Center 聚合跨 Workspace 的待处理事项。

## 9. 通知分类

### 9.1 按产品语义分类

| 类别 | 示例 | 默认是否 Toast | 是否持久保存 | 默认自动关闭 |
|---|---|---:|---:|---:|
| `feedback` | 已保存、已复制、已启用 | 是 | 否或短期 | 是 |
| `completion` | Canvas Run 完成、Automation 完成 | 是 | 是 | 是 |
| `information` | 文档已打开、发现新环境 | 是 | 可选 | 是 |
| `warning` | 预算接近上限、环境将过期 | 是 | 是 | 视情况 |
| `error` | Run 失败、Extension 更新失败 | 是 | 是 | 否 |
| `action_required` | 等待输入、等待审批、冲突 | 是 | 是 | 否 |
| `recovery` | `outcome_unknown`、`orphaned` | 是 | 是 | 否 |
| `security` | 权限扩大、Secret 失效、跨 Workspace 请求 | 是 | 是 | 否 |
| `system` | Host 重连、数据库迁移、更新完成 | 视重要性 | 是 | 视情况 |

### 9.2 严重级别

```ts
type NotificationSeverity =
  | "success"
  | "info"
  | "warning"
  | "error"
  | "critical";
```

严重级别只描述影响，不直接决定领域结果。例如 `waiting_approval` 通常是 `warning`，但涉及不可逆数据导出且即将过期时可以是 `critical`。

### 9.3 注意力级别

```ts
type AttentionLevel =
  | "passive"
  | "notice"
  | "action_required"
  | "urgent";
```

| 级别 | 行为 |
|---|---|
| `passive` | 只进入历史，不主动 Toast |
| `notice` | 显示 Toast，可自动关闭 |
| `action_required` | 显示 Toast 并进入 Attention Center，持续到处理 |
| `urgent` | 显示持久 Toast、Attention Center，并在允许时发送系统通知 |

## 10. Toast 展示规则

### 10.1 队列与堆叠

- 新通知从右上角加入堆栈顶部。
- 已显示通知保持自己的内容、计时器和关闭状态。
- 桌面宽度同时最多显示 4 条；窄屏最多显示 3 条。
- 超过可见数量的新通知仍写入 Notification Center。
- 被挤出可见区的普通 Toast 结束本次 Delivery，但不删除持久 Notification。
- `urgent` 不得被普通通知挤出；必要时替换最旧的 `notice` 展示位。
- 相同 Notification 的更新不得创建重复卡片，应通过相同 `notificationId` 更新进度或文案。

### 10.2 默认时长

| 场景 | 默认时长 | 规则 |
|---|---:|---|
| 简短成功反馈 | 5 秒 | 如安装完成、设置保存 |
| 普通信息 | 5 秒 | 内容不超过两行 |
| Canvas/Automation 完成 | 7 秒 | 用户可能需要确认对象名称 |
| 权限摘要、Extension 详情 | 8 秒 | 阅读型内容，不超过两行摘要 |
| Warning | 10 秒 | 同时进入 Center |
| Error | 不自动关闭 | 用户手动关闭；事实保留 |
| Action required | 不自动关闭 | 必须明确处理或手动收起 |
| Recovery/Critical | 不自动关闭 | 不得因超时消失 |

### 10.3 动态时长规则

- `durationMs` 由通知策略在创建时确定，前端不得根据 DOM 高度临时猜测。
- 当内容超过 120 个可见字符时，Toast 只显示摘要，并使用 `Open details` 进入详情，不通过无限延长 Toast 承载长文。
- Hover、键盘焦点进入 Toast 或用户打开其操作菜单时暂停计时。
-窗口/页面不可见时暂停自动关闭计时；重新可见后至少保留 2 秒。
- Screen Reader 正在朗读时不得提前卸载节点。
- `durationMs <= 0` 表示必须手动关闭。

### 10.4 进入与退出

- 默认从右侧沿同一路径进入和退出。
- 动画使用 `transform` 与 `opacity`，不得触发布局重排。
- 入场建议 320–400ms，退出建议 240–400ms。
- 同一条通知关闭后，下面的通知平滑补位，不瞬间跳跃。
- `prefers-reduced-motion` 下使用短淡入淡出，不进行大距离滑动。
- 动画结束后再从 React 树移除，避免退出被截断。

### 10.5 手动关闭

- 整张卡片可在无主操作时点击关闭；存在主操作时，点击卡片打开目标，关闭必须使用独立 `×`。
- 鼠标悬停或键盘聚焦时显示 `×`，按钮命中区至少 24×24 CSS px。
- 关闭一条只移除对应 `notificationId` 的 Delivery，不影响其他通知。
- 关闭 `action_required` Toast 后，Attention Center 仍保留该事项。
- 关闭普通历史通知是否同步标记 `read`，由命令参数明确表示，不允许隐式删除。

### 10.6 内容结构

```text
[Semantic Icon]  Title                   Time  [Close]
                 One or two-line summary
                 [Optional primary action]
```

- Title 使用动作结果或问题名称，如 `Extension permissions`、`Canvas completed`。
- Summary 包含对象名称和结果，如 `Citation Review finished successfully.`。
- Time 使用相对时间，悬停或详情中提供绝对时间。
- 图标必须表达语义，不使用无含义彩色圆点。
- 同一个语义在 Toast、Center 和对象页面使用同一种图标。
- 最多一个主操作和一个次操作；复杂决策进入详情页或审批面板。

## 11. Attention Center 需求

### 11.1 入口

- 位于全局 Titlebar 右侧，使用 Bell/Attention 语义图标。
- 未处理数量使用紧凑计数，不使用仅靠颜色的圆点。
- 数量超过 99 显示 `99+`。
- `urgent` 存在时使用警告图标与可访问文本，不使用持续闪烁。

### 11.2 默认分组

```text
Action Required
  Approval
  Human Input
  Conflict
  Recovery

Warnings
  Environment
  Budget
  Extension / Permission

Recent Activity
  Completed
  Failed
  Configuration changes
```

默认先按 Attention Level，再按时间倒序。用户可切换按 Workspace 分组。

### 11.3 列表项内容

- 严重级别和类型图标。
- 标题和两行摘要。
- Workspace / Canvas 上下文。
- 创建时间、截止时间或持续时间。
- 当前状态：Unread、Acknowledged、Resolved、Expired。
- 主操作，例如 `Review approval`、`Provide input`、`Open run`。
- 次操作，例如 `Mute this automation`、`Open canvas`。

### 11.4 过滤器

- All / Action Required / Warnings / Activity。
- Workspace。
- Canvas。
- 类型。
- 未读/已读。
- 时间范围。
- 搜索标题、对象名称和错误代码，不搜索敏感内容正文。

### 11.5 批量操作

允许：

- Mark selected as read。
- Dismiss resolved informational items。
- Mute a notification source with explicit scope。

不允许：

- 批量批准权限。
- 批量声明 `outcome_unknown` 已成功。
- 批量忽略安全提醒。
- 用 `Clear all` 删除未解决的 Attention Item。

## 12. 生命周期

### 12.1 Notification 生命周期

```text
created
  -> delivered
  -> seen
  -> read
  -> acknowledged
  -> resolved | expired | dismissed
```

说明：

- `delivered` 是渠道状态，可发生多次。
- `seen` 表示进入可见视口，不等于用户理解。
- `read` 是用户打开 Center 或目标详情后的展示状态。
- `acknowledged` 只表示知晓。
- `resolved` 必须由来源领域事实驱动。
- `dismissed` 只能作用于可隐藏的 Notification 视图，不能修改来源事实。

### 12.2 Delivery 生命周期

```text
queued -> visible -> closing -> closed
                    -> action_invoked
                    -> delivery_failed
```

每个渠道拥有独立 Delivery。系统通知失败不能把 Notification 标记为已读。

### 12.3 来源状态同步

| 来源事实变化 | Notification 行为 |
|---|---|
| Approval approved/rejected | 对应 Attention Item 标记 resolved，保留结果摘要 |
| WaitRecord 已提交 | 标记 resolved，Toast 可显示一次完成反馈 |
| Run 从 running 到 succeeded | 创建 completion Notification |
| Run 从 running 到 failed | 创建 error Notification，并保持到用户处理 |
| `outcome_unknown` 对账完成 | 更新原 Notification，不创建无关联重复项 |
| Extension 权限发生扩大 | 创建新的 security Notification，不覆盖旧版本记录 |

## 13. 去重与聚合

### 13.1 幂等键

每条 Notification 必须包含：

```text
dedupeKey = sourceEventId + notificationType + recipientScope
```

相同 `dedupeKey` 重放时更新已有记录，不新增重复项。

### 13.2 聚合键

```text
groupKey = workspaceId + sourceType + sourceId + notificationType
```

示例：同一 Automation 在短时间内连续完成 20 个子任务，聚合为：

> Morning literature review completed 20 items. 2 need attention.

### 13.3 聚合窗口

- 高频进度事件：不创建 Toast，只更新当前 Run 状态。
- 相同成功事件：10 秒内聚合。
- 相同警告：30 秒内聚合并增加计数。
- 相同错误代码但不同 Run：可按 Workspace 聚合展示，但必须保留每个 Run 的独立记录。
- 审批、人工输入、RecoveryCase 不聚合为不可区分的一条，最多做分组容器。

## 14. 点击与深链接

每条可操作通知必须包含稳定 `ObjectContext`：

```ts
interface ObjectContext {
  workspaceId: string;
  canvasId?: string;
  revisionId?: string;
  releaseId?: string;
  runId?: string;
  nodeRunId?: string;
  approvalRequestId?: string;
  waitRecordId?: string;
  recoveryCaseId?: string;
  extensionId?: string;
  aggregateSequence?: number;
  projectionPosition?: string;
}
```

点击行为：

1. 校验目标权限和对象是否仍存在。
2. 切换到目标 Workspace。
3. 打开正确 Canvas/Run/Panel。
4. 定位目标 NodeRun、Approval 或 RecoveryCase。
5. 更新 Notification 为 `read`，但不自动 `resolved`。

目标失效时进入明确状态：

- `deleted`
- `permission_denied`
- `migration_required`
- `resync_needed`
- `expired`

禁止静默跳到当前 Canvas 或同名对象。

## 15. Settings 需求

### 15.1 全局设置

| 设置 | 默认值 | 说明 |
|---|---|---|
| Successful runs | On | 显示完成 Toast |
| Failed runs | On，不可完全关闭 | 至少保留 Center 记录 |
| Waiting for input | On，不可关闭 Center | Toast 可静音 |
| Approval requests | On | 系统通知需单独授权 |
| Recovery alerts | On，不可关闭 | 可关闭声音，不可丢弃事实 |
| Extension changes | On | 安装、更新、权限扩大 |
| Automation activity | Important only | 成功聚合，失败即时 |
| System notifications | Off，按需请求 | 仅后台完成、失败和紧急事项 |
| Sound | Off | 默认克制，不依赖声音 |
| Quiet hours | Off | 可配置时间段 |

### 15.2 Workspace 覆盖

- 用户可以对某 Workspace 设置：Default、Muted、Important only。
- `Muted` 只影响主动 Delivery，不阻止持久记录。
- Security、Recovery 和不可逆操作审批不能被 Workspace 静音完全隐藏。
- 设置页必须显示继承来源和最终生效策略。

### 15.3 免打扰

- Quiet Hours 内普通 Toast 只进入 Center。
- `urgent` 仍可显示应用内提醒；系统通知是否突破免打扰遵守操作系统策略。
- Quiet Hours 结束时不一次性弹出全部积压 Toast，只显示摘要。

## 16. 系统通知

系统通知只用于应用不在前台且事件具有明确用户价值的情况：

- 长时间 Run 完成。
- Run 失败且阻塞目标。
- 等待人工输入或审批。
- Recovery/Critical 事件。

规则：

- 应用前台可见时默认只显示应用内 Toast。
- 请求操作系统通知权限必须发生在用户开启相关设置时，不在首次启动强制请求。
- 系统通知正文不得包含 Secret、完整 Prompt、敏感 Artifact 内容或工作区外路径。
- 点击系统通知进入稳定深链接。
- 操作系统通知被清除不改变应用内 Notification 状态。

## 17. 数据模型

```ts
interface NotificationItem {
  id: string;
  workspaceId?: string;
  type: NotificationType;
  severity: NotificationSeverity;
  attentionLevel: AttentionLevel;
  title: string;
  summary: string;
  sourceRef: DomainReference;
  target: NotificationTarget;
  dedupeKey: string;
  groupKey?: string;
  occurrenceCount: number;
  state: NotificationState;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  resolvedAt?: string;
  readAt?: string;
  acknowledgedAt?: string;
  actions: NotificationAction[];
  policy: NotificationDeliveryPolicy;
}

interface NotificationDeliveryPolicy {
  showToast: boolean;
  durationMs: number;
  persistInCenter: boolean;
  allowSystemNotification: boolean;
  bypassQuietHours: boolean;
  aggregationWindowMs?: number;
}

interface NotificationAction {
  id: string;
  label: string;
  kind: "open_target" | "command" | "dismiss";
  command?: StructuredCommand;
  requiresConfirmation: boolean;
}
```

### 17.1 数据约束

- `title` 最多 80 个可见字符。
- `summary` 最多 240 个可见字符；Toast 最多展示两行。
- 任何命令 Action 必须是结构化命令，禁止把自然语言文本解释为命令。
- `sourceRef` 和 `target` 至少存在一个。
- `action_required` 必须 `persistInCenter = true`。
- `critical` 默认 `durationMs = 0`。
- `resolvedAt` 由领域事件更新，不能仅由前端点击写入。

## 18. API 与事件合同

### 18.1 Query

```ts
listNotifications(input: ListNotificationsInput): Promise<Page<NotificationItem>>
getNotification(notificationId: string): Promise<NotificationItem>
getAttentionSummary(scope?: NotificationScope): Promise<AttentionSummary>
getNotificationPreferences(scope?: NotificationScope): Promise<NotificationPreferences>
```

### 18.2 Command

```ts
markNotificationRead(notificationId: string): Promise<void>
acknowledgeNotification(notificationId: string): Promise<void>
dismissNotificationDelivery(input: DismissDeliveryInput): Promise<void>
dismissResolvedNotifications(input: DismissResolvedInput): Promise<void>
invokeNotificationAction(input: InvokeNotificationActionInput): Promise<CommandReceipt>
updateNotificationPreferences(input: UpdateNotificationPreferencesInput): Promise<NotificationPreferences>
muteNotificationSource(input: MuteNotificationSourceInput): Promise<MuteRule>
```

### 18.3 Event

```ts
type NotificationEvent =
  | { type: "notification.created"; notification: NotificationItem }
  | { type: "notification.updated"; notification: NotificationItem }
  | { type: "notification.resolved"; notificationId: string; resolvedAt: string }
  | { type: "notification.read"; notificationId: string; readAt: string }
  | { type: "notification.delivery.requested"; delivery: NotificationDelivery }
  | { type: "notification.delivery.closed"; deliveryId: string; reason: DeliveryCloseReason };
```

### 18.4 订阅与恢复

- 使用事件游标订阅。
- 支持至少一次投递。
- 客户端按 event ID 和 Notification dedupeKey 去重。
- 游标失效时重新拉取快照，再继续增量订阅。
- UI 刷新不能重新弹出所有历史通知。
- 仅未确认 Delivery 或新的高优先级 Notification 可以在恢复后重新显示 Toast。

## 19. Extensions 场景详细需求

### 19.1 View Permissions

点击后创建独立通知：

```text
Title: Extension permissions
Summary: GitHub requests workspace-scoped repository access only.
Severity: info
Attention: notice
Duration: 8s
Action: Review details
```

如果权限较上一版本扩大：

```text
Title: Permission review required
Summary: GitHub now requests write access to pull requests.
Severity: warning
Attention: action_required
Duration: persistent
Action: Review update
```

### 19.2 Open Documentation

产生新的独立反馈，不更新 `View Permissions` 通知内容：

```text
Title: Documentation opened
Summary: GitHub documentation opened in the preview.
Severity: info
Duration: 5s
```

### 19.3 Install / Update / Uninstall

- Install 成功：5 秒成功通知。
- Update 成功且权限未变化：5 秒成功通知。
- Update 包含权限扩大：先审批，不能先显示成功。
- Uninstall 成功：5 秒成功通知，并说明受影响 Automation/Canvas 的数量。
- 操作失败：持久 Error，提供 Retry 和 Open diagnostics。

## 20. Automation 与 Run 场景

### 20.1 Automation

- 创建/修改：5 秒反馈。
- 手动 Run Now：5 秒 `started` 反馈，之后由 Run 事实更新。
- 连续成功：按 Automation 聚合。
- 失败：持久通知，并显示目标 Canvas 和错误代码。
- 被权限/环境阻塞：进入 Action Required。

### 20.2 Canvas Run

- `created/queued/running` 不产生重复 Toast，状态显示在 Canvas 和 Run Monitor。
- `succeeded` 产生 7 秒通知。
- `failed` 产生持久通知。
- `waiting_input`、`waiting_approval` 产生持久 Attention Item。
- `cancel_pending` 显示 Warning，不宣称已取消。
- `completed_after_cancel` 必须说明取消请求后动作仍完成。
- `outcome_unknown` 和 `orphaned` 进入 Recovery Center，不能作为普通 Error 自动关闭。

## 21. 文案规范

### 21.1 标题

使用具体名词和结果：

- 推荐：`Canvas completed`
- 推荐：`Approval required`
- 推荐：`Extension update failed`
- 禁止：`Success`
- 禁止：`Notice`
- 禁止：`Something happened`

### 21.2 摘要

使用“对象 + 结果 + 下一步”结构：

> Citation Review failed while validating references. Open the run to review 3 errors.

避免：

- 暴露堆栈全文。
- 使用无法翻译的字符串拼接。
- 把按钮名写入说明文案。
- 用感叹号制造紧迫感。
- 用颜色词描述状态。

### 21.3 UI 语言

当前 UI Lab 保持英文界面。通知内容必须通过本地化 key 和参数生成，领域事件不得直接存储最终英文句子作为唯一事实。

## 22. 可访问性

- Toast Stack 使用 `aria-live="polite"`。
- `critical` 可使用 `role="alert"`，但不得让批量事件反复打断读屏。
- 关闭按钮提供具体名称，如 `Dismiss Canvas completed`。
- 图标设置 `aria-hidden`，完整状态由文本表达。
- 键盘焦点进入 Toast 后暂停计时。
- 操作按钮具有稳定 Tab 顺序。
- 自动关闭前不移动当前焦点。
- 通知退出时如果焦点位于其中，将焦点返回触发来源或 Attention Center 入口。
- 支持 200% 文本缩放，不遮挡关闭按钮和时间。
- 高对比度下使用明确边界，不只依赖半透明材质。
- Reduced Motion 下取消大距离位移。

## 23. 响应式规则

### Desktop

- 宽度基准 346px。
- 距窗口顶部和右侧 10–16px。
- 最多 4 条。

### Narrow Desktop / Tablet

- 宽度 `min(346px, viewport - 20px)`。
- 最多 3 条。
- Attention Center 使用覆盖层或抽屉。

### 极窄窗口

- Toast 占可用宽度但保留 10px 外边距。
- 主操作可以换行到第二行。
- 不允许横向滚动。
- 不允许标题、时间和关闭按钮互相覆盖。

## 24. 空、加载、离线与异常状态

### Notification Center

| 状态 | 表现 |
|---|---|
| Empty | `No notifications yet`，不显示装饰性空心圆 |
| Loading | 保持列表骨架和筛选器位置 |
| Partial | 显示已载入范围、游标和重试入口 |
| Offline | 显示最后同步时间，允许查看缓存但不宣称已读命令已同步 |
| Permission denied | 显示缺少的最小权限和申请入口 |
| Resync required | 阻止错误的批量操作，执行快照重同步 |

### Toast Delivery 异常

- 动画失败不影响 Notification 持久记录。
- 系统通知权限被拒绝后，回退到应用内 Center。
- 目标对象已删除时，显示删除状态和可用的 Audit/Recovery 入口。
- Host 断开时，本地操作反馈只能显示 `Command queued locally` 或 `Unable to send`，不能显示成功。

## 25. 权限与安全

- Notification 查询必须遵守 Workspace 和对象读取权限。
- 通知列表不能泄露用户无权访问的 Workspace 名称、路径、Prompt、Artifact 或错误详情。
- Secret 只显示 `SecretRef` 的友好名称和状态，不显示值。
- 系统通知默认使用脱敏摘要。
- 点击敏感通知后重新校验权限。
- Action 调用使用当前 AuthoritySnapshot，不能沿用通知创建时已过期的权限。
- Approval 通知不得通过通知按钮绕过审批详情和影响预览。
- Dismiss、Read、Acknowledge 和 Resolve 必须记录审计主体和时间。

## 26. 性能与容量

- Toast Stack 最多挂载 4 个活动项。
- Notification Center 使用分页或虚拟列表。
- 默认加载最近 50 条，分页大小可配置为 50–100。
- 单 Workspace 保留策略由 Retention Policy 决定，UI 不无限保存。
- 高频 Runtime progress 不进入 Notification 表。
- 事件处理必须在 16ms 主线程预算外分批完成，避免 Run 高频更新造成卡顿。
- 1000 条历史通知下，筛选和滚动保持可用。

## 27. 数据保留

建议默认值：

| 类型 | 保留 |
|---|---:|
| 临时 feedback | 24 小时或不持久化 |
| completion / information | 30 天 |
| warning / error | 90 天 |
| approval / security / recovery | 跟随审计与来源对象策略 |
| Delivery 诊断记录 | 7–30 天 |

删除 Workspace 时，通知正文按策略删除或脱敏；审计要求保留的记录只保留稳定 ID、类型、时间和处理结果。

## 28. 埋点与度量

允许收集的产品事件：

- `notification_toast_shown`
- `notification_toast_dismissed`
- `notification_opened`
- `notification_action_invoked`
- `attention_center_opened`
- `notification_marked_read`
- `notification_group_expanded`
- `notification_delivery_suppressed`

每条事件只记录：通知类型、严重级别、停留时长区间、入口、是否聚合和动作结果。不得记录 Prompt、文件内容、Secret、完整错误正文或个人路径。

核心指标：

- Action Required 从创建到首次打开的中位时间。
- 从打开到解决的中位时间。
- 自动关闭前的主动点击率。
- Toast 被静音/快速关闭比例。
- 重复通知率。
- 聚合压缩率。
- 无法打开目标的深链接失败率。

## 29. Mock 数据要求

UI Lab 至少提供以下可复现样本：

1. 两条 Extensions 信息通知连续产生并同时存在。
2. 普通成功通知 5 秒后自动关闭。
3. 权限摘要 8 秒后自动关闭。
4. Error 和 Approval 通知不自动关闭。
5. 超过 4 条后，Toast Stack 保持稳定且历史仍完整。
6. Hover/Focus 暂停计时。
7. 单条关闭不影响其他通知。
8. Action Required 关闭 Toast 后仍留在 Attention Center。
9. 相同 event 重放不重复创建通知。
10. 跨 Workspace 通知点击后进入正确对象。

## 30. 验收标准

### 30.1 独立通知

```gherkin
Given 用户位于 Extensions 页面
When 用户点击 GitHub 的 View permissions
And 紧接着点击 Open documentation
Then 页面显示两条具有不同 notificationId 的 Toast
And 第二条不得修改或替换第一条的标题、摘要和计时器
```

### 30.2 自动关闭

```gherkin
Given 一条 durationMs 为 5000 的普通成功通知可见
When 用户没有悬停、聚焦或操作该通知
Then 通知在约 5 秒后进入 closing
And 完成退出动画后从 Toast Stack 移除
And 如该通知需要持久化，其 Center 记录仍存在
```

### 30.3 暂停计时

```gherkin
Given 一条自动关闭通知已经显示 3 秒
When 用户将鼠标移入该通知并停留 5 秒
Then 通知在 Hover 期间不关闭
And 鼠标移出后继续剩余时间
```

### 30.4 单条关闭

```gherkin
Given Toast Stack 中有三条通知
When 用户关闭中间一条
Then 只移除该 notificationId
And 另外两条保留原内容和剩余计时
And 堆栈平滑补位
```

### 30.5 Attention 持久性

```gherkin
Given Run 正在 waiting_approval
And 对应 Toast 已被用户关闭
When 用户打开 Attention Center
Then 该审批仍显示为 Action Required
And 用户可进入 Approval 详情
And 只有领域审批完成或过期后才变为 resolved
```

### 30.6 去重恢复

```gherkin
Given 客户端因断线错过 notification.created 的确认
When 重连后服务端以至少一次语义重放相同 eventId
Then 客户端只保留一个 NotificationItem
And 不重复弹出已经确认关闭的普通 Toast
```

### 30.7 可访问性

```gherkin
Given 用户只使用键盘
When 新通知出现
Then 当前焦点不被抢走
And 用户可通过 Attention Center 或正常 Tab 顺序访问通知操作
And 关闭后焦点回到稳定、可预期的位置
```

## 31. 测试范围

### Unit

- Duration policy。
- Queue cap。
- Dedupe/group 规则。
- Lifecycle reducer。
- Preference resolution。
- Deep-link builder。

### Component

- 多条 Notification 渲染。
- 自动关闭与退出动画。
- Hover/Focus 暂停。
- 关闭按钮键盘行为。
- Reduced Motion。
- 长文案和 200% 缩放。

### Integration

- Runtime Event → Notification Projection → Toast/Center。
- Read/Dismiss/Acknowledge/Resolve 区分。
- 断线、游标重连、快照重同步和去重。
- Workspace 切换和深链接。
- Settings 策略生效。

### End-to-End

- Extension 权限查看、文档打开、安装、更新失败。
- Canvas 成功、失败、等待输入、等待审批。
- Automation 批量完成和聚合。
- `outcome_unknown` 进入 Recovery Center。
- 窄屏无横向滚动和重叠。

## 32. 分阶段交付

### Phase 0：现有 UI Lab

- 独立通知队列。
- 最多 4 条堆叠。
- 5/7/8 秒基础时长。
- 单条关闭和退出动画。
- Extensions 等 Mock 页面接入。

### Phase 1：完整前端 Mock

- Notification Center。
- Attention Center。
- Error/Approval/Recovery 持久样本。
- Hover/Focus/Visibility 暂停。
- 设置页分类与免打扰。
- 深链接 Mock。

### Phase 2：Host 联调

- Notification Projection Service。
- Query/Command/Event 合同。
- 游标订阅与重连去重。
- Workspace 权限过滤。
- 系统通知适配器。

### Phase 3：受邀试点

- 聚合策略。
- Retention。
- 系统通知权限和 Quiet Hours。
- 产品指标与诊断。
- 大数据量、离线和恢复测试。

## 33. 依赖

- Unified State Registry。
- Runtime event stream and cursor recovery。
- Stable ObjectContext and deep links。
- Approval / WaitRecord / RecoveryCase 正式模型。
- Workspace authority and permission filtering。
- Settings persistence。
- Retention policy。
- Host background execution lifecycle。

## 34. 风险与应对

| 风险 | 影响 | 应对 |
|---|---|---|
| Toast 过多 | 干扰工作、遮挡画布 | 限制 4 条、聚合、低价值事件只进 Center |
| Toast 消失即丢失事实 | 用户错过审批和错误 | Action Required 必须持久化 |
| 重连重复通知 | 用户不信任系统 | eventId + dedupeKey 去重 |
| 深链接错误 | 用户处理错误对象 | 稳定 ID、权限重检、失效状态 |
| 敏感信息泄露 | 安全事故 | 脱敏摘要、按对象权限过滤 |
| 所有错误都持久 | Center 噪声过大 | Resolve、聚合、Retention 和过滤 |
| 自动关闭影响读屏 | 信息不可访问 | 焦点暂停、Live Region、持久 Center |
| 前端本地状态与 Runtime 分叉 | 状态冲突 | 单一投影、命令和事实事件分离 |

## 35. 待确认决策

1. Attention Center 最终采用右侧抽屉还是独立全局页面。
2. 普通 Notification 的默认持久化时间是否统一为 30 天。
3. 前台运行失败是否默认触发操作系统通知。
4. Workspace Muted 是否允许隐藏普通失败 Toast。
5. 系统通知点击后的窗口唤醒与多窗口定位策略。
6. 多设备或多 Host 场景下 Read/Acknowledge 是否同步。
7. 对于 `critical`，是否允许用户设置临时 Snooze，以及最长时长。

## 36. Definition of Done

本功能只有同时满足以下条件才算完成：

1. Notification、Delivery 和来源领域事实具有分离的数据模型。
2. 新通知不会覆盖旧通知，每条拥有稳定 ID 和独立生命周期。
3. Toast、Center、侧边栏和对象页面来自同一投影。
4. Error、Action Required、Recovery 不会因为自动关闭而丢失。
5. 所有通知可通过稳定深链接定位对象，目标失效有明确状态。
6. 至少一次事件重放不会产生重复持久通知。
7. 设置、Quiet Hours、Workspace 覆盖和系统通知策略可解释且可测试。
8. 键盘、读屏、Reduced Motion、高对比度和窄屏验收通过。
9. Unit、Component、Integration 和 E2E 测试覆盖本 PRD 的关键验收场景。
10. 文档、Mock API、正式 API 和实现使用相同枚举与字段语义。

