# 待确认问题

本文只保留尚未被正式合同解决、且需要产品或实现选择的问题。已经冻结的身份、版本、入口、状态、GraphPatch、权限和 LocalRestricted 边界不再重复列为开放问题；它们以 [27-normative-contracts/](27-normative-contracts/00-README.md) 为准。

这些问题不会改变已冻结的核心语义，但会影响具体实现、默认值或部署范围。

## Host 与平台

1. 本地 Agent Host 在 Windows、macOS、Linux 上的进程拓扑、升级、崩溃重启和退出策略如何统一？
2. 应用关闭、用户注销、锁屏、休眠和系统重启时，后台 Run 如何暂停、恢复或进入对账？
3. 多用户登录、系统账户切换和桌面会话隔离是否支持？每个 Host 的事实和凭据边界是什么？
4. IPC 使用何种版本协商、认证和兼容策略？旧 Workbench 如何连接新 Host？

## 执行器与外部能力

5. LocalRestricted 的具体系统实现是 Job Object、容器、沙箱 API 还是组合方案？各平台能力不足时如何降级并显式告警？
6. ContainerIsolated、RemoteManaged、LocalUnrestricted 和 ExternalDelegated 的首批支持范围、安装方式和生命周期是什么？
7. 外部 Agent 的身份、凭据、能力声明、取消协议、结果证明和费用统计如何统一？
8. 能力发现失败、适配器不可信或执行器版本不兼容时，系统是否允许 Agent 构造临时实现？临时实现的隔离和审批默认值是什么？

## 数据与存储

9. Artifact Store 的具体布局、加密密钥管理、压缩、校验、跨设备迁移和离线导出策略是什么？
10. 事件日志、Run 快照、投影和索引的 SQLite 表结构、迁移工具与损坏恢复策略是什么？
11. 默认保留时长、配额、垃圾回收触发条件和用户级保留覆盖如何配置？正式默认值仍待确定。
12. 多人协作编辑、远程同步和冲突合并是否属于产品范围？若支持，Draft 的并发编辑协议如何实现？

## Agent、策略与产品边界

13. 默认的人机协作策略是什么：Agent 提案后确认、受限自动应用，还是按风险等级自动分流？
14. 自动修复的风险阈值、每日预算、最长后台时长、并发上限和模型费用上限的默认值是什么？
15. Memory 何时可以申请提升为 Skill；Skill 的版本、撤销、灰度、回归测试和跨 Workspace 共享策略是什么？
16. 是否提供生产级桌面或浏览器自动化；若提供，证据采集、用户在场要求和不可逆操作确认如何定义？
17. 是否支持跨机器强一致恢复，还是明确限定为本地 Host 与最终一致的远程调用？

## UI 与运维

18. UI 的本地化、时区、无障碍等级、键盘导航和 reduced-motion 的正式验收标准是什么？
19. Notification、Attention Center、Approval Inbox 和 Recovery Center 的默认排序、声音/系统通知策略和免打扰规则是什么？
20. 开发者模式、诊断日志、事件回放和支持包导出是否向普通用户开放？敏感字段如何脱敏？

## 已经冻结、不再作为开放问题的内容

- CanvasDraft、CanvasRevision、CanvasRelease 的身份和运行引用关系。
- 默认入口、命名入口、触发器以及 `primaryNodeId` 的迁移语义。
- 统一状态注册表及 `orphaned`、`outcome_unknown`、`completed_after_cancel` 的含义。
- GraphPatch 与 RunPatch 的边界、原子性、影响分析和权限扩大规则。
- 跨画布至少一次投递、去重、恢复和循环检测基础语义。
- AuthorityProfile 取代布尔全权模式，以及 LocalRestricted 的最低边界。
