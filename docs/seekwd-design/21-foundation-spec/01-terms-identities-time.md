# 术语、身份与时间

## 身份与显示名称

所有可被引用的对象都分为稳定身份和可变元数据：

```text
Stable Identity    永久 ID，不因重命名、移动或展示语言变化而改变
Display Metadata   名称、说明、图标、颜色和标签，可以版本化修改
```

稳定 ID 不能由名称、坐标、数组索引或用户输入直接生成。对外展示可以使用短 ID，但内部引用必须使用完整 ID 和对象类型。

## ID 组成

```text
ObjectId
  kind          对象类别
  namespace     所属边界
  value         随机或不可预测的唯一值
```

`namespace` 用于隔离工作区、系统、共享包和运行临时空间。跨边界引用必须明确来源 namespace，不能仅凭字符串猜测。

## 引用

```text
ObjectRef
  kind
  id
  version?       对可变对象的精确版本引用
  revision?      对内容对象的精确内容版本
```

需要可重放的引用必须包含 version 或 revision。只有明确声明浮动语义的开发期查询才可以省略版本。

## 关联 ID

```text
requestId       一次 API 或 UI 请求
goalId          一个长期目标
runId           一次运行
nodeRunId       一次节点执行
attemptId       一次尝试
correlationId   一条跨节点 / 跨画布 / 跨执行单元链路
parentRunId     父运行
causationId     直接触发当前事件的事件或操作
```

`correlationId` 用于串联同一业务链路，`causationId` 用于解释因果关系，不能互相替代。

## 时间

所有持久化时间使用 UTC 的绝对时间，并保存生成方时钟信息；展示层再转换为用户时区。需要排序的事件使用单调序列或逻辑时钟，不能只依赖本机墙上时钟。

```text
occurredAt      事实发生时间
observedAt      系统观察到事实的时间
acceptedAt      系统接受消息的时间
expiresAt       结果、授权或等待的失效时间
```

外部时间可能不可靠，不能把 `observedAt` 当作外部事实的 `occurredAt`。

## 版本、修订和尝试

- **Version**：定义语义变化，通常不可变。
- **Revision**：同一资源内容的版本。
- **Attempt**：同一 NodeRun 的一次执行尝试。
- **Checkpoint**：恢复运行所需的状态快照。

重试增加 Attempt，不生成新的节点定义；改变节点契约生成新 Definition Version；改变画布结构生成新 Canvas Version。

