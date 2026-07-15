# Theming

The picker renders its own UI, so it ships one stylesheet and themes through CSS custom properties.
There's no utility framework to configure and nothing to wire up beyond a single import.

## Import the stylesheet

The stylesheet is **required** — without it the dialog is unstyled. Import it once in your app's
entry:

```ts
import '@anil-labs/file-picker-core/styles.css'
```

## Light, dark & auto

Set the `theme` option to `'light'`, `'dark'` or `'auto'` (the default):

```ts
new FilePicker({ adapter, theme: 'auto' }) // 'light' | 'dark' | 'auto'
```

- **`auto`** follows the OS via `prefers-color-scheme`.
- **`light`** / **`dark`** force a mode regardless of the OS setting.

Under the hood the theme is applied as a class on the picker root: `theme: 'dark'` adds `.fp--dark`,
`theme: 'light'` adds `.fp--light`, and `auto` adds neither (so the `prefers-color-scheme` rules
apply). You can add those classes yourself if you theme a region of the page independently.

## Switch the theme at runtime

The dialog header shows a **light/dark toggle button** by default — hide it with
`themeToggle: false`. To drive the theme from your app (e.g. to mirror your own light/dark switch),
call `setTheme()`:

```ts
const picker = new FilePicker({ adapter, theme: 'auto' })
picker.setTheme('dark') // 'light' | 'dark' | 'auto'
picker.on('theme', (t) => console.log('theme is now', t))
```

The framework bindings pass `theme` reactively, so binding a prop is enough:

```tsx
// React — the picker follows your app's theme state
<FilePicker adapter={adapter} theme={appIsDark ? 'dark' : 'light'} />
```

## Responsive

On narrow viewports the filter bar collapses into an **off-canvas drawer**, opened from the
toolbar's filter button, so the media grid keeps the screen. It's automatic — nothing to configure.

## Customize with `--fp-*` variables

All colors, the corner radius and the shadow are CSS variables on the `.fp` root. Override them in
your own stylesheet to match your brand:

```css
.fp {
  --fp-accent: #7c3aed;
  --fp-accent-soft: rgba(124, 58, 237, 0.12);
  --fp-radius: 16px;
}
```

### Available variables

| Variable | Purpose | Light default |
| --- | --- | --- |
| `--fp-bg` | Dialog background | `#ffffff` |
| `--fp-fg` | Primary text | `#1f2733` |
| `--fp-muted` | Secondary text | `#6b7280` |
| `--fp-faint` | Faint / placeholder text | `#9aa4b2` |
| `--fp-border` | Borders and dividers | `#e5e7eb` |
| `--fp-surface` | Panels and inputs | `#f8fafc` |
| `--fp-surface-2` | Raised surface | `#eef2f7` |
| `--fp-hover` | Hover background | `#f1f5f9` |
| `--fp-accent` | Accent / primary color | `#3b82f6` |
| `--fp-accent-soft` | Accent tint (selection) | `rgba(59, 130, 246, 0.12)` |
| `--fp-accent-fg` | Text on the accent color | `#ffffff` |
| `--fp-danger` | Destructive actions | `#e5484d` |
| `--fp-good` | Success | `#16a34a` |
| `--fp-overlay` | Modal backdrop | `rgba(15, 23, 42, 0.55)` |
| `--fp-radius` | Corner radius | `12px` |
| `--fp-shadow` | Dialog shadow | `0 12px 44px rgba(2, 8, 23, 0.22)` |

## Dark mode overrides

The stylesheet supplies dark values automatically for `theme: 'auto'` (via `prefers-color-scheme`)
and for `.fp--dark`. To tune the dark palette, override the variables under the dark selectors:

```css
.fp.fp--dark,
@media (prefers-color-scheme: dark) {
  .fp:not(.fp--light) {
    --fp-bg: #12151a;
    --fp-accent: #8ab4ff;
  }
}
```

## Scope styles with `className`

Add a custom class to the picker root with the `className` option to target one instance without
affecting others:

```ts
new FilePicker({ adapter, className: 'brand-picker' })
```

```css
.brand-picker {
  --fp-accent: #ef6c00;
}
```
