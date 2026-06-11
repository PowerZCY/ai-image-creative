# slot-text React 使用评估与动画能力说明

本文基于当前仓库源码进行判断：`package.json`、`src/react.ts`、`src/slotText.ts`、`style.css`、`examples/react.tsx`、`dist/*`。结论适用于当前仓库里的 `slot-text@0.1.1`；如果 npm 包后续升级，应重新检查发布包内容。

## 1. 代码安全性结论

总体判断：React 场景下可以使用，运行时安全风险低。主要风险不是恶意代码，而是组件内部会直接管理并改写自身 `span` 的 DOM 子节点，同时需要引入一份全局 CSS。

可放心的点：

- 没有运行时依赖。核心动画只使用浏览器 DOM API、`setTimeout`、CSS transition。
- 没有安装脚本。`package.json` 中没有 `preinstall`、`postinstall` 等生命周期脚本。
- 没有网络请求、存储读写、cookie/localStorage/sessionStorage 访问，也没有动态 `eval`、`Function` 或脚本注入。
- `text` prop 最终通过 `textContent` 写入字符节点，不是 `innerHTML`，因此普通文本不会被当作 HTML 执行。
- React 组件是薄封装：挂载时构建字符 DOM，`text` 变化时触发动画，卸载时清理。
- 包声明 MIT license。

需要注意的点：

- `<SlotText />` 不接收 `children`，只能通过 `text` prop 传入展示文本。
- 组件内部会生成 `span.char-slot`、`span.char-sizer`、`span.char-face`，不要用外部代码直接操作这些内部节点。
- 每次 `text` 变化都会触发 DOM 动画。短文本按钮、状态、计数器适合；大量长文本或列表同时高频刷新不适合。
- 它是浏览器 DOM 动画组件。SSR 输出阶段不会生成最终字符动画结构，动画 DOM 会在客户端挂载后建立。

推荐 React 引入方式：

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function SaveLabel({ saved }: { saved: boolean }) {
  return (
    <SlotText
      text={saved ? "Saved" : "Save"}
      options={{
        direction: saved ? "up" : "down",
      }}
    />
  );
}
```

## 2. 自带样式是否会影响已有样式

会引入全局 CSS，但影响面较小。

`style.css` 只定义这些类：

- `.slot-text`
- `.char-slot`
- `.char-slot.is-resizing`
- `.char-sizer`
- `.char-face`

它没有重置 `body`、`button`、`span` 等基础元素，也没有通配选择器，所以不会大范围污染页面。

真实风险在于类名较通用：

- 如果项目中已有 `.slot-text`、`.char-slot`、`.char-face` 等类，样式可能互相影响。
- `.slot-text` 会给组件根元素设置 `display: inline-flex` 和 `white-space: pre`，这会影响该组件自身的布局表现。
- `.char-slot`、`.char-face` 等内部类不应被项目业务 CSS 复用。

核心样式作用如下：

```css
.slot-text {
  display: inline-flex;
  white-space: pre;
}

.char-slot {
  position: relative;
  display: inline-flex;
  flex: none;
  justify-content: center;
  overflow: hidden;
  overflow-x: visible;
  overflow-y: clip;
  line-height: 1.3;
  vertical-align: bottom;
}

.char-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: pre;
  will-change: transform;
}
```

## 3. React 中如何避开样式影响

推荐方案按优先级如下。

### 方案 A：只在短文本位置使用组件

把 `<SlotText />` 放在按钮、badge、状态标签内部，让它只负责文字，不要把它当通用容器。

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function CopyButton({ copied }: { copied: boolean }) {
  return (
    <button className="copyButton" type="button">
      <SlotText
        className="copyButtonLabel"
        text={copied ? "Copied" : "Copy"}
        options={{
          direction: copied ? "up" : "down",
          skipUnchanged: false,
        }}
      />
    </button>
  );
}
```

项目自己的样式写在外层或传给组件的业务类上：

```css
.copyButton {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.copyButtonLabel {
  font-weight: 600;
}
```

不要这样写：

```tsx
// 不支持：SlotTextProps 排除了 children
<SlotText text="Copy">
  <span>Copy</span>
</SlotText>
```

### 方案 B：检查类名冲突

在项目里搜索这些类名：

```bash
rg "\b(slot-text|char-slot|char-sizer|char-face|is-resizing)\b"
```

如果没有冲突，直接导入官方 CSS 即可。如果已有同名业务类，优先重命名业务类，或使用方案 C。

### 方案 C：复制 CSS 并加作用域前缀

如果项目 CSS 冲突风险较高，可以不直接导入 `slot-text/style.css`，改为在自己的样式文件里包一层作用域。

React：

```tsx
import { SlotText } from "slot-text/react";

export function ScopedCopyLabel({ copied }: { copied: boolean }) {
  return (
    <span className="mySlotScope">
      <SlotText text={copied ? "Copied" : "Copy"} />
    </span>
  );
}
```

CSS：

```css
.mySlotScope .slot-text {
  display: inline-flex;
  white-space: pre;
}

.mySlotScope .char-slot {
  position: relative;
  display: inline-flex;
  flex: none;
  justify-content: center;
  overflow: hidden;
  overflow-x: visible;
  overflow-y: clip;
  line-height: 1.3;
  vertical-align: bottom;
}

.mySlotScope .char-slot.is-resizing {
  overflow-x: clip;
}

.mySlotScope .char-sizer {
  visibility: hidden;
  white-space: pre;
}

.mySlotScope .char-face {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: pre;
  will-change: transform;
}
```

此时不要再导入：

```tsx
// 不导入这个
// import "slot-text/style.css";
```

注意：源码内部生成的类名不可配置，所以 CSS 选择器仍必须包含 `.slot-text`、`.char-slot`、`.char-sizer`、`.char-face`。

## 4. 可以展示哪些文本动画形式

这个包的核心动画只有一种：按字符分槽的垂直滚动切换。它不是打字机、淡入淡出、随机洗牌字符、路径文字或逐词动画库。

但通过 React 的 `options` prop 可以组合出多种表现：

- 向下滚动：新字符从上方进入，旧字符向下离开。
- 向上滚动：新字符从下方进入，旧字符向上离开。
- 逐字符延迟：用 `stagger` 控制字符依次滚动的波浪感。
- 快慢变化：用 `duration` 控制每个字符滚动时间。
- 弹性落点：用 `easing` 和 `bounce` 控制回弹、轻微倾斜和落地手感。
- 彩色闪入：用 `color` 让新字符带颜色进入，再恢复为原文本颜色。
- 彩虹扫过：用 `chromatic()` 给每个字符不同 hue。
- 局部更新：默认 `skipUnchanged: true`，相同位置且相同字符不动。
- 整体重滚：设置 `skipUnchanged: false`，即使相同字符也一起滚动。
- 长度变化：从短文本变长、从长文本变短时，字符槽宽度会动画调整。

适合的 React UI：

- 按钮状态：`Copy` -> `Copied`
- 保存状态：`Save` -> `Saved`
- 请求状态：`Idle` -> `Loading` -> `Done`
- 数字计数：`099` -> `100`
- 短 badge：`Beta` -> `Live`
- 短 tab 标签：`Grid` -> `List`

不适合：

- 大段正文或长标题
- Arabic、Devanagari 等需要上下文连写或复杂 shaping 的文字
- 强依赖字偶距 kerning 或 ligature 的大号展示字体
- 复杂 emoji ZWJ 序列
- 高频、大批量、长列表同时动画

## 5. 动画性能评估

总体判断：对短文本 UI 来说很轻量，适合按钮、状态、badge、计数器这类场景。它没有引入 animation library，也没有每帧 JavaScript 循环；主要成本来自文本变化瞬间的 DOM 拆分、尺寸测量和定时器调度。

轻量的原因：

- 无运行时依赖，包内核心逻辑就是 DOM API + CSS transition。
- 动画过程主要走 CSS `transform`，`char-face` 上设置了 `will-change: transform`，浏览器通常可以用合成层处理，避免每帧用 JavaScript 改样式。
- 没有 `requestAnimationFrame` 循环，也没有逐帧计算。
- 每个字符只创建少量 `span`，动画结束后会重建为干净 DOM，旧 face 会被移除。
- 动画可中断；如果新文本在旧动画未结束时到来，源码会先 settle 到目标状态，再开始下一次动画，避免内部节点无限堆积。

实际成本：

- 每个字符会生成一个 `.char-slot`，里面有 `.char-sizer` 和 `.char-face`；变化时还会临时增加一个新 `.char-face`。
- 动画开始时会读 `getComputedStyle(...)` 和 `getBoundingClientRect(...)`，也会测量字符宽高。这些读布局操作对短文本没问题，但大量并发会增加主线程压力。
- 每个变化字符会注册若干 `setTimeout` 和一次 `transitionend` 监听。短按钮文本通常只是几个到十几个字符，成本很低。
- `color: chromatic()` 本身只是生成 HSL 字符串，成本可以忽略；但彩色淡出会多一个 `color` transition。

适合的规模：

- 单个按钮、状态标签、badge：很轻。
- 页面上十几个短文本组件：通常没问题。
- 计数器或状态文本低频更新：没问题。
- 大标题短句：可以用，但比按钮文本更容易看到 kerning 和裁切问题。

不建议的规模：

- 长段落、几十到几百字符的文本。
- 表格中上百行同时滚动。
- 高频计时器每几十毫秒更新一次。
- 大量组件在移动端低端机上同时触发动画。
- 虚拟列表里每次滚动都触发新的 slot-text 动画。

React 性能建议：

```tsx
import "slot-text/style.css";
import { memo } from "react";
import { SlotText } from "slot-text/react";

export const StatusLabel = memo(function StatusLabel({
  status,
}: {
  status: "Idle" | "Running" | "Done";
}) {
  return (
    <SlotText
      text={status}
      options={{
        direction: status === "Done" ? "down" : "up",
        stagger: 24,
        duration: 220,
        bounce: 0.1,
        skipUnchanged: false,
      }}
    />
  );
});
```

如果 `options` 是在父组件里创建的，建议用稳定对象，避免无意义的 prop 变化。当前源码只在 `text` 变化时触发动画，`options` 单独变化不会触发动画，但稳定对象仍有利于 React 组件树性能。

```tsx
import "slot-text/style.css";
import { useMemo } from "react";
import { SlotText } from "slot-text/react";

export function CounterLabel({ value }: { value: number }) {
  const options = useMemo(
    () => ({
      direction: "up" as const,
      stagger: 16,
      duration: 200,
      bounce: 0.15,
      skipUnchanged: false,
    }),
    [],
  );

  return <SlotText text={String(value).padStart(3, "0")} options={options} />;
}
```

一个实用判断：如果展示文本通常少于 20 个字符、变化频率不是每秒多次、页面上不是几十上百个同时动，就可以认为它足够轻量。

## 6. React 示例

### 示例 1：复制按钮，向上滚动并彩色闪入

```tsx
import "slot-text/style.css";
import { useState } from "react";
import { SlotText } from "slot-text/react";
import { chromatic } from "slot-text";

export function CopyButton() {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
    >
      <SlotText
        text={copied ? "Copied" : "Copy"}
        options={{
          direction: copied ? "up" : "down",
          skipUnchanged: false,
          color: copied ? chromatic({ from: 190 }) : undefined,
        }}
      />
    </button>
  );
}
```

表现：`Copy` 整体向上滚成 `Copied`，新字母带青蓝到彩色的闪入效果，然后回到普通颜色；1.4 秒后向下滚回 `Copy`。

### 示例 2：保存状态，只让变化字符动

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function SaveStatus({ saved }: { saved: boolean }) {
  return (
    <SlotText
      text={saved ? "Saved" : "Save"}
      options={{
        direction: saved ? "down" : "up",
        skipUnchanged: true,
      }}
    />
  );
}
```

表现：相同位置相同字符尽量保持不动，新增或变化字符滚动。适合 `Save` -> `Saved` 这类短状态变化。

### 示例 3：数字计数器，快速向上滚动

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function CounterLabel({ value }: { value: number }) {
  return (
    <SlotText
      text={String(value).padStart(3, "0")}
      options={{
        direction: "up",
        stagger: 20,
        duration: 220,
        bounce: 0.2,
        skipUnchanged: false,
      }}
    />
  );
}
```

表现：数字像机械槽轮一样快速上滚。`skipUnchanged: false` 会让所有数字都参与滚动，视觉更统一。

### 示例 4：状态机标签，降低弹性，更稳重

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

type JobState = "Idle" | "Running" | "Done";

export function JobStateLabel({ state }: { state: JobState }) {
  return (
    <SlotText
      text={state}
      options={{
        direction: state === "Done" ? "down" : "up",
        stagger: 35,
        duration: 260,
        bounce: 0,
        easing: "cubic-bezier(0.2, 0, 0, 1)",
        skipUnchanged: false,
      }}
    />
  );
}
```

表现：更像产品后台里的状态切换，没有明显弹跳。

### 示例 5：带 aria-label 的按钮文字

源码里 React 组件会默认把 `aria-label` 设置为当前 `text`。如果按钮本身已有完整可访问名称，也可以显式传入。

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function SubmitButton({ pending }: { pending: boolean }) {
  return (
    <button type="submit" aria-label={pending ? "Submitting form" : "Submit form"}>
      <SlotText
        text={pending ? "Submitting" : "Submit"}
        aria-label={pending ? "Submitting" : "Submit"}
        options={{
          direction: pending ? "up" : "down",
          skipUnchanged: false,
        }}
      />
    </button>
  );
}
```

表现：按钮视觉文本滚动切换，同时保留明确的可访问文本。

## 7. 字号与移动端响应式

支持不同字号，也支持 Tailwind 这类响应式字号，例如 `text-sm md:text-base`。原因是源码会在动画时读取当前元素的 `getComputedStyle(...)`、`getBoundingClientRect(...)` 和字符槽尺寸，按当前字体大小、字体族、字重、行高计算字符宽高。

需要注意：

- `<SlotText />` 本身渲染为 `span`，可以放进 `h1`，也可以直接给它传 `className`。
- 字号、字重、字体族、颜色可以从父元素继承，也可以直接写在 `<SlotText className="..." />` 上。
- 移动端断点切换字号是 CSS 自己处理的，slot-text 会在下一次 `text` 改变并触发动画时按当前尺寸重新测量。
- 如果正在动画过程中发生 viewport resize 或断点切换，当前这一帧动画不会主动重算所有字符槽；实际项目中通常问题不大。如果有强需求，可以在断点变化后让 `text` 重新渲染一次，或避免在 resize 中连续触发动画。
- 大字号如 `h1` 会放大按字符拆分带来的限制：字偶距 kerning 会丢失，ligature 不会形成，极高的展示字体可能被垂直滚动遮罩裁切。短标题可以用，长标题不建议。

### h1 大标题示例

推荐写法：保留语义 `h1`，让 `<SlotText />` 继承 `h1` 的字号和字重。

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";
import { chromatic } from "slot-text";

export function HeroTitle({ active }: { active: boolean }) {
  return (
    <h1 className="text-4xl font-bold leading-tight tracking-normal md:text-6xl">
      <SlotText
        text={active ? "Launch faster" : "Build cleaner"}
        options={{
          direction: active ? "up" : "down",
          stagger: 35,
          duration: 320,
          bounce: 0.25,
          color: active ? chromatic({ from: 210, spread: 120 }) : undefined,
          skipUnchanged: false,
        }}
      />
    </h1>
  );
}
```

也可以把字号直接放在 `<SlotText />` 上：

```tsx
<SlotText
  className="text-4xl font-bold leading-tight tracking-normal md:text-6xl"
  text={active ? "Launch faster" : "Build cleaner"}
  options={{
    direction: "up",
    skipUnchanged: false,
  }}
/>
```

第一种更适合页面标题，因为 `h1` 语义清楚；第二种适合非标题位置的大号动画文字。

### text-sm md:text-base 示例

这种响应式小文本完全支持，适合按钮、状态、badge、表格操作等位置。

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function StatusText({ online }: { online: boolean }) {
  return (
    <SlotText
      className="text-sm font-medium leading-5 text-zinc-700 md:text-base md:leading-6"
      text={online ? "Online" : "Offline"}
      options={{
        direction: online ? "up" : "down",
        stagger: 24,
        duration: 220,
        bounce: 0.15,
        skipUnchanged: false,
      }}
    />
  );
}
```

如果它在按钮里，也可以让按钮控制字号，`SlotText` 只继承：

```tsx
import "slot-text/style.css";
import { SlotText } from "slot-text/react";

export function ResponsiveButtonLabel({ loading }: { loading: boolean }) {
  return (
    <button className="inline-flex items-center text-sm font-medium md:text-base">
      <SlotText
        text={loading ? "Loading" : "Submit"}
        options={{
          direction: loading ? "up" : "down",
          stagger: 22,
          duration: 220,
          bounce: 0.1,
          skipUnchanged: false,
        }}
      />
    </button>
  );
}
```

移动端建议：

- 用明确的 `line-height`，例如 `leading-5 md:leading-6`，避免字体过高时滚动遮罩看起来紧。
- 短文本优先，尤其是按钮和 badge。
- 避免负 `letter-spacing`；按字符拆分后负字距容易让大字号标题显得拥挤或重叠。
- 如果外层容器很窄，给按钮或标签设置稳定布局，例如 `inline-flex items-center`，必要时给文本容器加 `min-w-*` 避免切换文案时按钮宽度跳动太明显。

## 8. 参数速查

React 组件签名：

```ts
type SlotTextProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> & {
  text: string;
  options?: SlotOptions;
};
```

`options` 类型：

```ts
type SlotOptions = {
  direction?: "up" | "down";
  stagger?: number;
  duration?: number;
  exitOffset?: number;
  easing?: string;
  bounce?: number;
  color?: string | ((index: number, total: number) => string);
  colorFade?: number;
  skipUnchanged?: boolean;
};
```

默认值：

```ts
{
  direction: "down",
  stagger: 45,
  duration: 300,
  exitOffset: 50,
  easing: "cubic-bezier(0.34, 1.56, 0.64, 1)",
  bounce: 0.6,
  colorFade: 280,
  skipUnchanged: true,
}
```

推荐组合：

```ts
// 稳重产品 UI
{
  direction: "up",
  stagger: 30,
  duration: 240,
  bounce: 0,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  skipUnchanged: false,
}
```

```ts
// 活泼按钮反馈
{
  direction: "up",
  stagger: 45,
  duration: 300,
  bounce: 0.6,
  color: chromatic({ from: 190 }),
  skipUnchanged: false,
}
```

```ts
// 数字槽轮
{
  direction: "up",
  stagger: 16,
  duration: 200,
  bounce: 0.15,
  skipUnchanged: false,
}
```

## 9. 最终建议

React 项目可以使用这个包，但建议只用于短文本 UI 动画：按钮、状态、计数、badge、短命令。源码安全面较干净，没发现明显恶意行为或高危运行时操作。

集成时重点处理两件事：

- CSS 只导入一次：`import "slot-text/style.css";`。
- 检查 `.slot-text`、`.char-slot`、`.char-sizer`、`.char-face` 是否和项目 CSS 冲突；如有冲突，复制 CSS 并用外层作用域包住。
