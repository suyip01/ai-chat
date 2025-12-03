## 问题分析（代码影响点）
- `src/index.html`：`<meta name="viewport" content="width=device-width, initial-scale=1.0" />` 缺少 `viewport-fit=cover`，导致刘海/状态栏安全区未正确计算。
- 全局根容器高度使用 `h-screen/h-full`（100vh）或 `fixed inset-0`：在移动端地址栏/键盘出现时，100vh 与可视高度不一致，导致布局被“顶上去”。
- `src/user/App.tsx`：
  - 外层容器使用 `fixed inset-0` + 内层 `h-full`，会受 100vh 问题影响。
  - 已添加禁用双击缩放，但未处理安全区顶部（safe-area-inset-top）。
- `src/user/components/ChatDetail.tsx`：
  - 顶部栏容器未显式加 `padding-top: env(safe-area-inset-top)`；底部输入已加 `pb-[env(safe-area-inset-bottom)]`，顶部未处理。
  - 外层容器高度用 `h-full` 而非动态视口单位（dvh/svh），在键盘弹出时易出现顶推。
- `src/user/components/ChatItem.tsx`：列表项自身无高度/定位问题，不会影响状态栏，但列表父容器仍受根容器高度与安全区影响。
- `src/index.tsx`：仅挂载，没有视口修正逻辑。

## 解决方案
1. 视口安全区与动态高度
- 在 `src/index.html` 的 viewport 增加 `viewport-fit=cover`（保持其他设置不变），使浏览器提供正确安全区。
- 在用户端运行时注入 `--vh` 动态变量：`--vh = window.innerHeight * 0.01`，并在 `resize`/`orientationchange`/`focus`（键盘显示）时更新；将根容器与聊天页外层容器高度设置为 `calc(var(--vh) * 100)`。
- 使用新视口单位 `100dvh`（如果 Tailwind 版本不支持，使用内联样式或自定义类）作为兜底。

2. 顶部安全区与布局调整
- 给 ChatDetail 顶部栏容器添加 `padding-top: env(safe-area-inset-top)`，确保刘海/状态栏不覆盖；同时给外层容器加 `padding-bottom: env(safe-area-inset-bottom)` 以保持整体安全区一致。
- 将 ChatDetail 外层与 App 根容器高度设为 `min-height: 100dvh` 或 `height: calc(var(--vh) * 100)`，避免 100vh 被地址栏/键盘影响。

3. 滚动与溢出控制
- 在用户端根容器启用：`overscroll-behavior: none`，避免因系统滚动引起布局抖动。
- 保持内容区内部使用 `overflow-y: auto`，而根容器/外层使用 `overflow: hidden`，避免整体向上被顶。

4. 不影响其他端（仅用户端）
- 所有改动只在 `src/user` 初始化时生效：通过在 `App.tsx` 挂载时注入/恢复 `meta viewport` 的覆盖（已实现禁用双击缩放），同时设置 `--vh` 与样式；不修改 admin 端或公共端入口。

## 具体实施步骤
1. `src/index.html`
- 将 viewport 改为：`<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />`

2. `src/user/App.tsx`
- 在 `useEffect` 中：
  - 计算并设置 `document.documentElement.style.setProperty('--vh', ...)`；监听 `resize`/`orientationchange`/`focus`/`blur` 更新该值。
  - 设置根容器/最外层包裹的 `style={{ height: 'calc(var(--vh) * 100)' }}` 或 `min-h-[100dvh]`。
  - 设置 `document.body.style.overscrollBehavior = 'none'`；清理时恢复。
- 将外层包裹的主容器添加安全区：顶部 `pt-[env(safe-area-inset-top)]`，底部保持已有 `pb-[env(safe-area-inset-bottom)]`。

3. `src/user/components/ChatDetail.tsx`
- 给顶部栏容器添加 `pt-[env(safe-area-inset-top)]` 或在外层包裹添加一次性顶部 padding。
- 将外层固定容器/内部容器统一用 `min-h-[100dvh]` 或 `style={{ minHeight: 'calc(var(--vh) * 100)' }}`。

4. 验证
- Android Chrome 与 iOS Safari：
  - 打开聊天页，点击输入框，键盘弹出时顶部标题不被推上去；收起键盘后高度恢复。
  - 横竖屏切换时高度正确调整。

如确认，我将按上述步骤将 viewport-fit、动态 vh 与 safe-area 顶部 padding 落地到用户端，并限制在用户端入口生效。