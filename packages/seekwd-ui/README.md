# Seekwd UI

Seekwd UI 是面向 Seekwd / Pong Harness 桌面工作台的 React 组件库。它从 WebSwift 的紧凑比例、macOS 控件质感和克制层次出发，但使用受控 React API、原生可访问语义和统一设计令牌重新实现。

## 当前组件

- 基础：`Button`、`IconButton`、`TextField`、`Checkbox`、`Switch`、`Progress`
- 选择与反馈：`SegmentedControl`、`StatusBadge`、`Tooltip`、`Menu`、`Dialog`、`Notice`、`MessageBox`、`Notification`
- 工作台：`WindowFrame`、`Toolbar`、`SidebarSection`、`SidebarItem`、`InspectorSection`、`PropertyRow`、`PanelHeader`
- 画布：`CanvasNode`、`Port`

## 使用

```tsx
import { Button, WindowFrame } from "@seekwd/ui";
import "@seekwd/ui/styles.css";
```

主题由组件祖先上的属性控制：

```html
<div data-sk-theme="dark">...</div>
```

## 约束

- 组件只描述展示和交互，不直接访问 Host、文件系统或运行时。
- 业务状态必须由调用方控制，不在组件内部复制领域事实。
- 图领域对象先经过适配器，再转换为 `CanvasNode` 的展示属性。
- 图标使用 Lucide；熟悉操作优先使用图标按钮并提供可访问名称。
- 不使用字符串命令执行、`innerHTML` 或隐式全局事件。
