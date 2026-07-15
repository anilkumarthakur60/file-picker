# @anil-labs/file-picker-element

**The `<file-picker>` Web Component for [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)** — a media-library file picker usable in any framework or plain HTML.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-element?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-element)

## Install

```bash
npm i @anil-labs/file-picker-element
```

## Quick start

```html
<link rel="stylesheet" href="https://unpkg.com/@anil-labs/file-picker-core/dist/styles.css" />
<file-picker multiple label="Choose media" title="Media Library"></file-picker>

<script type="module">
  import '@anil-labs/file-picker-element' // registers <file-picker>
  import { createMemoryAdapter } from '@anil-labs/file-picker-core'

  const el = document.querySelector('file-picker')
  el.adapter = createMemoryAdapter({ media: [], folders: [] }) // adapter is a property
  el.addEventListener('fp:select', (e) => console.log(e.detail))
</script>
```

For a plain `<script>` (no bundler), use the self-contained IIFE build from
`@anil-labs/file-picker-element/dist/index.global.js` (unpkg / jsDelivr).

## API

- **Attributes:** `multiple`, `label`, `title`, `theme` (`light`/`dark`/`auto`), `per-page`, `show-selected`.
- **Property:** `.adapter` (a `FilePickerAdapter` — required, set via JS).
- **Events:** `fp:select`, `fp:change`, `fp:upload` — `event.detail` is the `MediaItem[]`.
- **Methods / getters:** `openPicker()`, `closePicker()`, `.selected`, `.picker`.

Importing the package auto-registers the element. Remember to include the core stylesheet.

## Documentation

**<https://anilkumarthakur60.github.io/file-picker/frameworks/web-component>**

## License

MIT © Er. Anil Kumar Thakur
