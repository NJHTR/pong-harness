# API 与订阅边界

## API 设计原则

API 表示领域命令和查询，不暴露数据库表或 UI 组件状态。每个 API 都要求身份、作用域、版本、幂等、错误模型和审计关联。

## 命令 API 分组

```text
Goals        submit / clarify / update / cancel
Canvases     create draft / patch / validate / publish / fork
Runs         start / pause / resume / cancel / replay / branch
Nodes        execute debug / retry / handoff / lock
Artifacts    upload / resolve / preview / deliver / retain
Approvals    request / decide / revoke
Skills       propose / verify / publish / deprecate
```

## 查询 API 分组

```text
goal detail and history
canvas version and diff
graph validation
run timeline and live state
node run inputs / outputs / evidence
artifact lineage
approval inbox
capability catalog and health
memory and skill search
audit query
```

## 订阅

订阅以事件游标为基础，客户端可断线恢复：

```text
subscribe(scope, cursor, filters) -> event stream
ack(cursor)
resync(snapshot) when cursor expired
```

UI 不能只依赖临时推送；任何丢失事件都必须能通过快照和游标补齐。

## API 版本

命令、查询和事件分别版本化。废弃字段保留迁移期，服务端返回能力协商信息。客户端不能根据未知字段猜测默认安全行为。

