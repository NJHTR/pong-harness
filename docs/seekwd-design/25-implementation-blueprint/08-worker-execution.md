# Worker 执行

## Worker 生命周期

```text
spawn -> handshake -> prepared -> running -> draining -> exited
                       \-> rejected / crashed / orphaned
```

启动时校验 worker 身份、协议、Manifest、上下文边界和 Run / NodeRun 绑定。

## Heartbeat

Worker 定期报告状态、资源摘要、最后处理的输入序号和可取消性。心跳停止不等于动作停止；Host 进入 reconciliation，而不是立即重跑。

## 输入输出

小型结构化值使用消息传输；大内容通过 ArtifactHandle。Worker 只能读取被挂载或授权的 Artifact，不能凭路径猜测工作区范围。

## 取消

Host 发送取消请求并等待 Receipt；worker 报告 cancelled、cancel_pending、completed_after_cancel 或 unknown。不能把发送取消请求直接当作已取消。

## 资源限制

Worker 启动时得到时间、内存、CPU、磁盘、网络、进程、输出和调用次数限制。资源使用作为事件和指标返回；超限触发终止、等待或错误策略。

## 结果收集

Worker 退出前提交 NodeResult、流结束标记、Artifact 引用和清理状态。Host 先持久化结果，再释放 worker 和上下文。

