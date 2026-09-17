# Seekwd UI 系统

本目录定义 Seekwd 桌面工作台的视觉语言、组件边界和交互基线。它服务于复杂、长期运行的专业工具，不模拟完整 macOS 桌面。

## 目标

- 保留 WebSwift 中紧凑、清晰、接近原生桌面控件的比例与质感。
- 让画布、检查器、运行面板和 Agent 协作界面遵守同一套设计语言。
- 让视觉组件与领域状态、Host 和执行器解耦。
- 同时支持浅色、深色、减少动态效果和减少透明度设置。

## 风格原则

1. **专业工作台，而非桌面模拟器**：不引入壁纸、Dock、启动台或多个漂浮应用窗口。
2. **信息优先**：主字号 11–13px，节点和面板保持紧凑；标题不承担营销展示功能。
3. **克制层级**：主要依靠表面明度、间距和细分隔线，不依靠夸张阴影和粗边框。
4. **有限色彩**：中性色构成主体，蓝色只表达焦点、选择和主要操作；状态色只表达状态。
5. **渐进披露**：节点显示执行必需信息，完整配置进入检查器，低频命令进入菜单。
6. **直接操控**：画布拖动、分栏调整和节点连接必须即时响应并允许中断。
7. **人类控制权**：运行、暂停、停止、审批、等待输入和 Agent 修改必须有稳定、可预测的位置。

## WebSwift 映射

| WebSwift 控件 | Seekwd UI | 改造原则 |
|---|---|---|
| `swift-button` | `Button` / `IconButton` | 使用 React 事件，不执行字符串命令；补齐尺寸和语义变体 |
| `swift-input` | `TextField` | 受控/非受控兼容；补齐 label、描述、错误和图标区域 |
| `swift-checkbox` | `Checkbox` | 使用原生 checkbox，支持键盘、焦点和 disabled |
| `swift-switch` | `Switch` | 使用原生 checkbox + `role=switch`，状态由调用方控制 |
| `swift-progress` | `Progress` | 增加可访问进度语义、标签和不确定状态 |
| `swift-menu` | `Menu` | 增加打开状态、外部关闭、方向键、Escape 和禁用项 |
| `swift-tooltip` | `Tooltip` | 与可聚焦触发器配合，支持上下方位 |
| `swift-messagebox` | `MessageBox` / `Dialog` | 图标式确认框沿用 300ms 入场；工作台表单确认使用独立 `Dialog`；二者均使用原生 dialog |
| `swift-notification` | `Notification` / `Notice` | 系统式横幅沿用 400ms 入场；工作区内静态反馈使用独立 `Notice` |
| `swift-window` | `WindowFrame` | 只作为单个工作台窗口骨架，不实现网页桌面窗口管理器 |

## 组件层级

```text
Design tokens
  -> primitive controls
  -> feedback and overlays
  -> workbench shell components
  -> canvas presentation components
  -> feature compositions
```

基础控件不得引用画布或运行时类型。画布组件不得执行领域命令，只通过回调报告用户意图。Feature 层负责把意图转换成 GraphCommand、GraphPatch 或 RunCommand。

## 令牌

令牌定义在 `packages/seekwd-ui/src/styles.css`：

- 表面：window、canvas、sidebar、panel、control、elevated、node
- 文本：primary、secondary、tertiary
- 结构：border、subtle border、divider、focus ring
- 语义：accent、success、warning、danger
- 深度：window、popover、node 三个等级
- 几何：control、panel、window 三个圆角等级

令牌表达语义，不使用 `blue-500`、`gray-800` 之类具体颜色名称。业务组件不得硬编码主题色。

## 布局基线

```text
Titlebar 38px（完整工作台）/ 28px（WebSwift 对照窗口）
Sidebar 212px
Inspector 260px
Bottom panel 154px（可折叠、可调整）
Control 23px / 28px
Canvas node 220px 默认宽度
```

窄窗口优先收起检查器，其次允许侧栏切换为覆盖层。画布本身保持可平移，不通过压缩节点宽度解决空间不足。

## 运行状态表达

- `idle`：中性灰，仅说明可执行。
- `running`：蓝色状态点和边框，允许展示进度。
- `waiting`：橙色状态点，必须同时提供用户可执行入口。
- `success`：绿色状态点，不使用整块绿色背景。
- `error`：红色边框和状态点，详细错误进入检查器或运行面板。

颜色不是唯一通道；文字状态始终保留。

## 当前实现

- 组件包：`packages/seekwd-ui`
- 展示与交互实验室：`apps/ui-lab`
- 启动：`pnpm dev`
- 构建：`pnpm build`
- 类型检查：`pnpm typecheck`

UI Lab 是设计验证面，不保存领域数据，也不模拟 Host 执行成功。

组件展示页使用参考仓库中的森林背景，仅用于对照 WebSwift 的窗口和控件材质。正式工作台使用中性背景，不显示壁纸或完整桌面模拟。默认浅色主题更接近参考控件；暗色主题仍作为独立工作模式支持。

WebSwift 原版 `demo/index.html` 已在本地实际交互检查：展示窗口为约 60% 视口宽、80% 视口高、28px 标题栏；按钮按压使用亮度变化；开关约 250ms；Messagebox 约 300ms 弹出；Notification 为约 346×76px、400ms 从右侧进入。组件实验室依此校准，但不复制原版的字符串命令执行或不可访问的交互实现。

输入框使用与参考 Demo 一致的焦点反馈机制：默认保留透明约 9px outline，聚焦后在 220ms 内过渡到约 3px 半透明强调色 outline；该变化不参与盒模型，因此不会移动相邻内容。启用 `clearable` 时，清除按钮在聚焦后以 250ms 淡入，并保持焦点留在输入框。组件实验室使用英文文案，避免为对照页面强行加入中文；正式工作台通过独立本地化层提供语言切换。

## WebSwift 逐项校准记录

| 控件 | 已核对的参考细节 | Seekwd 状态 |
|---|---|---|
| Window | 12px 红黄绿灯、左侧 8px、间距 8px；整组悬停显示关闭/最小化/缩放符号；按下亮度 `.9`；对照窗口标题栏 28px | 已实现；正式工作台保留 38px 以容纳工具栏 |
| Button | `3px 7px` 内边距、5px 圆角、主按钮 17% 高光、按下亮度反馈、禁用弱化 | 已实现，并保留原生 button 语义 |
| Input | 206×22px 基准、普通输入直角、搜索输入 5px 圆角、9px 到 3px focus outline、250ms 清除按钮 | 已实现；宽度可由布局覆盖 |
| Switch | 26×15px、12px 圆点、250ms 状态过渡、按下亮度反馈 | 已实现 |
| Menu | 30px blur、200% saturation、13px/16px 菜单项、5px 内边距、蓝色悬停项 | 已实现，并增加键盘导航与 Escape |
| Checkbox | 14px 方框、8px 勾、3.5px 圆角、按下亮度反馈 | 已实现，并增加焦点与 disabled 状态 |
| MessageBox | 内容宽 228px、16px 横向 padding、64px 图标、20px 间距、300ms Pop | 已实现，并使用原生 dialog 管理焦点 |
| Notification | 346×76px、40px 图标、400ms 右侧进入/退出、按下亮度反馈 | 已实现；关闭动画结束后再通知 React 卸载 |
| Progress | 100×6px、紧凑高度 3px、填充宽度 300ms 过渡 | 已实现，并增加 progressbar 语义 |
| Tooltip | 3px×6px padding、11px 字号、轻量半透明材质 | 使用可聚焦触发器的可访问版本；保留同等视觉密度 |

原版窗口的 `resize: both` 属于网页桌面窗口管理行为，不放进通用 `WindowFrame`。未来桌面 Host 的移动、缩放、关闭、最小化和最大化通过窗口适配器接入；当前组件已暴露 `onClose`、`onMinimize`、`onZoom`，无回调时作为对照页装饰控件。
