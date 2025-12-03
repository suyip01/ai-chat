## 范围与目标
- 仅修改 `src/admin` 目录内代码的颜色与背景色，不改布局与结构。
- 将所有以紫色为主题的 Tailwind 类与相关阴影/渐变统一切换为粉色，整体风格偏现代极简（更多白底、适度层次）。

## 现状摘要（颜色使用点）
- `AdminDashboard.jsx:76` 使用 `text-purple-300`
- `components/Sidebar.jsx:90,93,105,136,159,161,163` 使用 `bg/text/border-purple-*`
- `components/LoginPage.jsx:35,38,39,43,47,50` 使用 `bg/text-purple-*` 以及 `from-purple-500 to-indigo-500`
- `components/AvatarEditor.jsx:104,115,155,204,208,428,443,458` 使用 `text/bg/border/accent/ring 紫色`
- `settings`、`characters`、`templates`、`users` 等各视图文件多处使用 `purple-*` 与渐变 `from-purple-* to-indigo-*`（具体行号已核对）

## 统一替换映射
- 文本色：`text-purple-900/800/700/600/500/400/300 → text-pink-900/800/700/600/500/400/300`
- 背景色：`bg-purple-50/100/200/500/600 → bg-pink-50/100/200/500/600`
- 边框/分隔：`border-purple-50/100/200/300 → border-pink-50/100/200/300`，`divide-purple-50/100 → divide-pink-50/100`
- 强调/环形：`accent-purple-500 → accent-pink-500`，`ring-purple-100/50 → ring-pink-100/50`
- 状态色：`hover:text-purple-600 → hover:text-pink-600`，`hover:bg-purple-50/100 → hover:bg-pink-50/100`
- 阴影色：`shadow-purple-200(/50) → shadow-pink-200(/50)`；若阴影过重则使用通用 `shadow-sm` 以符合极简
- 渐变：`bg-gradient-to-* from-purple-500 to-indigo-500/600 → from-pink-500 to-pink-600` 或直接使用 `bg-pink-500`（更简洁）

## 文件级变更清单（仅颜色）
- `AdminDashboard.jsx`：紫色文本改为粉色文本
- `components/Sidebar.jsx`：所有 `bg/text/border-purple-*`、`hover:text-purple-*` 改为对应 `pink-*`
- `components/LoginPage.jsx`：整体按钮与卡片渐变 `from-purple → to-indigo` 改为 `from-pink → to-pink` 或纯 `bg-pink-500`；文本/背景/阴影全部切到 `pink-*`
- `components/AvatarEditor.jsx`：标签、按钮、开关、输入强调色 `accent`、激活 `ring` 全部替换为 `pink-*`
- `settings/*.jsx`：按钮、分隔线 `divide-*`、边框、选中态背景、文本色统一替换
- `characters/*.jsx`：卡片、筛选/分页按钮的 `purple-*` 与渐变移除或替换为 `pink-*`
- `templates/*.jsx`：同上，含分页选中态的 `bg-purple-500` 等替换
- `users/*.jsx`：按钮与面板背景、文本色与分隔线统一替换

## 极简风格准则
- 背景以 `bg-white`、`bg-pink-50/100` 为主，层次轻，避免过多彩色底。
- 主要行动按钮使用 `bg-pink-500 hover:bg-pink-600 text-white`。
- 辅助强调使用 `text-pink-600/700`，边框分隔保持浅色（`border-pink-100/200`）。
- 阴影弱化为 `shadow-sm` 或保留 `shadow-pink-200`（不改变布局）。

## 验证与检查
- 视觉检查 admin 所有页面的按钮、标签、分页、开关、选中态在浅背景下的对比与可读性是否良好。
- 确认没有修改任何布局类（如 `flex/grid/justify/space/rounded` 等）。
- 仅变更 `src/admin`，不触及其他目录。

## 交付方式
- 批量替换并逐文件核对，保证不改变逻辑；提供差异预览便于你审阅。
- 可选择保留少量渐变：`from-pink-500 to-pink-600`，或统一极简为纯色。

请确认是否按上述方案执行（统一替换为 `pink-*`，并简化渐变与阴影），我将开始应用到 `src/admin` 并提交改动。