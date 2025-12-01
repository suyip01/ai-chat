角色设定： 你是一位精通 React 生态和移动端用户体验的高级前端工程师。请根据以下技术栈和具体需求，为我生成一个完整的 Web App 项目架构和核心代码。

1. 技术栈 (Tech Stack)
核心框架: React 18+ (使用 Vite 构建)

样式库: Tailwind CSS (用于原子化样式)

路由管理: react-router-dom (v6)

状态保持/缓存: react-activation (用于实现 Vue 风格的 KeepAlive，解决后退不刷新问题)

动画库: framer-motion (用于页面切换转场)

图标库: lucide-react (可选)

2. 核心布局策略 (Layout Strategy)
目标平台: 优先针对移动端设计 (Mobile First)。

电脑端适配 (PC View): 采用“居中模拟器”策略。

背景：深灰色或模糊背景。

容器：限制最大宽度 (max-w-[430px])，水平居中 (mx-auto)，高度占满屏幕 (min-h-[100dvh])。

视觉：给容器添加阴影 (shadow-2xl) 和圆角，使其在电脑屏幕上看起来像一个手机应用。

移动端适配: 宽度 100%，高度使用 100dvh 防止移动端浏览器地址栏遮挡。

3. 核心交互需求 (Interaction Requirements)
A. 智能缓存 (Keep-Alive Logic):

前进刷新: 当用户进入新页面（如从“列表页”进入“详情页”）时，详情页必须重新渲染，获取最新数据。

后退缓存: 当用户从“详情页”返回“列表页”时：

列表页不刷新。

列表页的 DOM 状态保持不变。

滚动条位置必须精确恢复到离开时的位置。

实现方式: 使用 react-activation 的 <AliveScope> 和 <KeepAlive> 包裹列表类组件。

B. 页面转场动画 (Transitions):

使用 framer-motion 实现原生 App 风格的 Push/Pop 动画。

进入: 新页面从屏幕右侧滑入 (x: 100% -> 0)。

退出: 旧页面向左侧轻微位移并变暗 (Parallax 视差效果)。

注意: 页面容器需使用 absolute 定位，防止动画过程中页面上下堆叠。

C. 微交互 (Micro-interactions):

所有可点击元素（按钮、列表项）必须有 active:scale-95 或 active:opacity-70 的反馈，模拟原生触摸质感。

全局 CSS 设置 touch-action: pan-y 优化滚动性能。

禁用移动端默认的双击缩放。

