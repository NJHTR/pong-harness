# 版本、持久化与迁移

> 兼容说明：本文的 `CanvasVersion` 是旧称。正式对象和运行引用规则以 [27-normative-contracts/02-identity-version-model.md](../27-normative-contracts/02-identity-version-model.md) 为准。

## 版本对象

```text
CanvasDraft       可编辑工作副本
CanvasRevision    不可变完整图
CanvasRelease     稳定可调用发布
NodeDefinitionVersion 不可变节点契约
RunSnapshot       运行时解析快照
RunPatch          只影响某次运行的临时图变更
```

## 发布条件

CanvasRevision 发布为 CanvasRelease 前必须通过：

- 输入输出接口校验。
- 所有节点配置 Schema 校验。
- 边、映射、条件和循环校验。
- 环境和权限静态检查。
- 终止性和资源上限检查。
- 最小验证运行或人工豁免记录。

发布后版本内容不可变；名称、标签和说明可以通过元数据版本更新，但不能改变运行语义。

## 兼容性

画布调用声明目标版本范围和接口兼容级别：

```text
exact       精确版本
compatible  允许声明为兼容的补丁或次版本
floating    由策略解析最新满足版本
```

生产运行应解析为 exact 版本并写入 RunSnapshot，避免未来发布改变历史行为。

## 节点版本迁移

节点定义升级需要提供配置迁移和端口迁移规则。迁移必须更新 CanvasDraft 并保存为新的 CanvasRevision；不能在原 Revision 或 Release 中直接替换定义引用。

## 持久化原子性

保存图版本、GraphPatch、Run Event、NodeRun 状态和 Artifact 引用时，要保证引用关系不会出现“状态已成功但输出引用未保存”的半提交状态。跨存储系统使用事务、幂等写入或可恢复的提交日志。

## 删除和归档

画布、节点版本和 Artifact 默认逻辑删除。只有没有活动运行、版本、技能、审计或外部调用引用时，才允许物理清理；清理前必须完成引用检查。
