# AI 图片创作 Demo UI 重设计规范

## 设计定位

这个 demo 应该从“表单式生成器”升级为“现代 AI 图片创作工作台”。

核心体验不是让用户填写一组参数，而是让用户在一个有创意氛围的空间里完成：

- 输入模糊想法。
- 获得助手启发。
- 调整模型、风格、比例等轻量设置。
- 生成图片。
- 对结果进行 variation、编辑、引用和提交。
- 从主题和他人作品中继续获得灵感。

设计关键词：

- Creative workspace
- Image-first
- Calm premium
- Lightweight assistant
- Gallery-driven inspiration
- Iterative creation

避免的方向：

- 传统后台表单。
- 老式互联网按钮堆叠。
- 营销落地页。
- 大聊天机器人界面。
- 过度卡片化的 SaaS dashboard。

## 产品设计原则

### 1. 图片优先

AI 图片创作产品的第一视觉资产应该是图片、主题视觉和生成结果，而不是输入框和说明文案。

页面结构应优先让用户看到：

- 主题图。
- 生成结果。
- 精选作品。
- 可复用灵感。

Prompt、模型设置和助手动作是创作工具，不应该抢占所有视觉注意力。

### 2. 创作器是核心，不是普通表单

生成器应被设计成 composer：

- 大输入区像草稿台。
- 底部设置像工具条。
- 助手动作是轻量快捷按钮。
- 高级参数默认折叠。
- Generate 是唯一强主按钮。

推荐结构：

```text
[ reference ] Describe anything you want to create...

[ Ideas ] [ Improve ] [ Ask ]     [ Model ] [ Style ] [ Ratio ] [ Count ] [ Generate ]
```

### 3. 助手是建议层，不是聊天页

Assistant 默认不展示大聊天框。

它有三种状态：

- 默认：只显示 2-3 个快捷动作。
- 建议：展示 3-5 个可采纳方向。
- 短对话：用户主动 Ask assistant 时展开。

助手输出必须短、具体、可操作，每条建议都应该有 `Use` 或 `More like this`。

### 4. 主题是创作挑战，不是文章详情

Theme Detail 页面应有轻微展览感：

- 大标题。
- 主题 brief。
- 主题视觉。
- 参与数据。
- 紧跟创作器。
- 下方展示精选作品。

不要把主题页做成普通内容详情页。

### 5. 结果卡片鼓励迭代

生成结果不应该只提供下载。

每张图都应该支持：

- 查看 prompt。
- 编辑。
- variation。
- use as reference。
- submit。

但操作按钮不能全部平铺成噪音。主操作突出，次级操作低调。

## 视觉系统

### 色彩

推荐使用浅色高级创作工作台风格。

```css
--bg: #f4f1ea;
--bg-2: #ebe7dd;
--surface: rgba(255, 253, 248, 0.88);
--surface-solid: #fffdf8;
--surface-2: #eee9df;
--ink: #171717;
--muted: #6f6a61;
--line: rgba(23, 23, 23, 0.11);
--line-strong: rgba(23, 23, 23, 0.18);
--accent: #171717;
--creative: #7c3aed;
--cyan: #0891b2;
--warm: #f97316;
```

使用原则：

- 主操作用深色或近黑色。
- 创意强调用紫色、青色、暖橙色少量点缀。
- 不要让界面被单一紫色、米色或深蓝色支配。
- 背景可以有细微材质感，但不要使用装饰性光球、bokeh、漂浮 orb。

### 字体层级

```css
--text-xs: 12px;
--text-sm: 13px;
--text-md: 15px;
--text-lg: 18px;
--text-xl: 24px;
--text-display: 44px;
```

规则：

- 首页和主题页标题可以大，但不做营销 hero。
- Composer 内部文字保持工具感。
- Prompt 输入框 18-22px。
- 卡片标题 16-18px。
- Metadata 12-13px。

### 圆角与阴影

整体圆角克制：

- 小控件：10-14px。
- Composer：24-28px。
- 图片卡片：14-18px。
- Modal：22-26px。

阴影应轻，不制造浮夸玻璃感：

```css
--shadow-soft: 0 18px 50px rgba(23, 23, 23, 0.08);
--shadow-strong: 0 26px 80px rgba(23, 23, 23, 0.18);
```

## 布局规范

### 总体布局原则

不要把主要页面默认做成左右两栏 dashboard。

AI 图片创作界面应该优先使用单列画布式布局：

- 创作器作为页面主舞台，全宽展示。
- 主题、灵感、结果作为下方或周边的视觉 band。
- 只有在明确的工具型场景里，才使用紧凑侧栏。
- 首页尤其不能把生成器压缩到左栏、把今日主题放到右栏。

推荐页面节奏：

```text
Primary creation canvas
Visual inspiration band
Generated results
Recent themes / gallery
```

这样用户会先感受到“我正在创作”，而不是“我在填一个后台表单”。

### 首页

首页应优先呈现自由创作。

推荐顺序：

1. 创作器。
2. 今日主题视觉入口。
3. 生成结果。
4. 近几天主题。
5. Explore archive。

首页生成器默认不绑定主题。今日主题只是灵感入口。

### Theme Detail

推荐结构：

```text
Theme header
  Title / brief / stats / actions
  Visual collage

Create for this theme
  Composer
  Theme result canvas

Prompt ideas
Featured images
```

### Explore

Explore 默认展示 Themes。

要求：

- Theme 卡片以视觉为主。
- Images 视图每张图必须显示所属 theme。
- 过滤器保持轻，不像后台搜索表单。

### My Studio

My Studio 是个人创作资产管理台。

要求：

- 创作器清楚。
- 图片库像资产 grid。
- 状态标签明显。
- tabs 用于筛选状态。
- 不做营销说明。

## 组件规范

### Topbar

Topbar 应像工作台导航：

- 半透明。
- 轻 blur。
- 品牌 mark 简洁。
- nav 使用 segmented pill。

### Button

按钮分三级：

- Primary：Generate、Submit。
- Secondary：Use、View theme、Create from this theme。
- Ghost/Icon：Download、Like、Save、Close、More。

不要把所有按钮做成同等重量。

### Composer

Composer 是最高优先级组件。

要求：

- 大面积输入。
- 参考图入口视觉化。
- 底部工具条稳定。
- settings 用 popover/drawer。
- safety/status 是低调文字。

### Assistant Output

Assistant 输出像 suggestion tray。

要求：

- 浅色背景。
- 建议条目有编号感。
- `Use` 操作清晰。
- `More like this` 次级。
- 不要长篇解释。

### Image Card

图片卡片应 image-first：

- 图片占主要面积。
- metadata 在图片下方。
- prompt 默认 2-3 行。
- 操作区有主次。
- hover 时轻微上浮。

### Modal

Modal 应更像创作确认面板：

- 大圆角。
- 图片 preview 视觉占比足够。
- 表单字段少。
- 主按钮明确。

## 动效规范

只使用轻量动效：

- button hover：颜色和边框变化。
- card hover：轻微上浮。
- modal：淡入。
- assistant/result 展开：淡入或位移。
- generate 状态：status 文案或 skeleton。

避免：

- 大面积弹跳。
- 花哨背景动画。
- 长时间 loading 动画。

## 响应式规范

移动端优先保证：

- Composer 仍然是第一屏核心。
- 工具条可以横向滚动。
- 图片 grid 变单列。
- theme header 变纵向。
- modal 变单列。
- 文本不挤压按钮。

## 当前 demo 改造重点

第一阶段只做 UI 和交互样式升级，不改变产品流程。

改造范围：

- 重建 CSS token。
- 升级 topbar、nav、composer、assistant、image card、theme card、modal。
- 减少按钮噪音。
- 强化图片区域和 gallery 视觉。
- 增加 hover/focus/transition 状态。
- 优化移动端布局。

不做：

- 接入真实生成模型。
- 增加复杂路由。
- 改变已有页面结构。
- 重写业务状态逻辑。
