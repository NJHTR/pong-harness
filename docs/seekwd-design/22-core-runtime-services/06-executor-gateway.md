# 执行器网关

## 责任

Executor Gateway 将统一的 ExecutionEnvelope 转换为具体执行器调用，并把执行器差异收敛为 ExecutionHandle、Observation、StreamChunk、NodeResult 和 ReleaseResult。

## 执行器接口

```text
describe() -> ExecutorDescriptor
prepare(envelope) -> PreparedExecution
start(prepared) -> ExecutionHandle
poll(handle) -> ExecutionSnapshot
subscribe(handle) -> Stream
cancel(handle, reason) -> CancellationReceipt
collect(handle) -> NodeResult
release(handle) -> ReleaseReceipt
```

## 边界

执行器必须：

- 接受明确的资源和权限范围。
- 拒绝未知配置和未声明输入。
- 返回结构化错误和部分结果。
- 声明取消是否真实生效。
- 声明是否可重试、可恢复和是否有副作用。
- 记录自身版本、执行上下文和健康状态。

执行器不能：

- 自行修改 CanvasVersion 或 GoalVersion。
- 自行扩大文件、网络、进程或秘密范围。
- 把自然语言输出当作 GraphPatch。
- 在父 Run 取消后继续无关联运行。

## 副作用边界

外部副作用前后都要有事件：准备、已发起、已确认、结果未知、已补偿或无法补偿。网络断开时不能把“请求已发出但响应丢失”错误地标记为未执行。

## 流式执行

流必须有开始、数据块、警告、完成或失败事件；每块带序号和校验。网关负责背压、丢块检测、重连和取消，不能让生产者无限写入内存。

