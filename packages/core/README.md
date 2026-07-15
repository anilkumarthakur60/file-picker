# @anil-labs/file-picker-core

**The framework-agnostic engine behind [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)** — a media-library file picker (folders, upload, filters, metadata editing, single/multi selection) that renders its own themeable UI and talks to any backend through a pluggable adapter. Zero runtime dependencies.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-core?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-core)

Using a framework? Prefer the binding — it wires selection into your reactivity and cleans up
automatically: [React](https://www.npmjs.com/package/@anil-labs/file-picker-react) ·
[Vue](https://www.npmjs.com/package/@anil-labs/file-picker-vue) ·
[Svelte](https://www.npmjs.com/package/@anil-labs/file-picker-svelte) ·
[Solid](https://www.npmjs.com/package/@anil-labs/file-picker-solid) ·
[Web Component](https://www.npmjs.com/package/@anil-labs/file-picker-element)

## Install

```bash
npm i @anil-labs/file-picker-core
```

## Usage

```ts
import { FilePicker, createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css' // required for the UI

const picker = new FilePicker({
  adapter: createMemoryAdapter({ media: [], folders: [] }),
  multiple: true,
  title: 'Media Library',
})

picker.mountTrigger(document.querySelector('#pick'), { label: 'Choose media' })
picker.mountSelected(document.querySelector('#selected'))
picker.on('select', (items) => console.log('picked', items))
```

## Adapters

The engine is backend-agnostic. Provide one of:

- **`createRestAdapter(config)`** — a configurable REST client (defaults suit a Laravel-style API); override `mapMedia` / `parseList` / `toListParams` etc. for other shapes.
- **`createMemoryAdapter(seed)`** — in-memory, for demos, prototypes and tests.
- **your own `FilePickerAdapter`** — eight async methods: `listMedia`, `deleteMedia`, `updateMedia`, `uploadMedia`, `listFolders`, `createFolder`, `renameFolder`, `deleteFolder`.

## Instance API

- `open()` / `close()` / `isOpen`
- `getSelected()` / `setSelected(items)`
- `on(event, handler)` → unsubscribe. Events: `open`, `close`, `change`, `select`, `upload`, `delete`, `error`
- `mountTrigger(el, { label })` / `mountSelected(el)` → dispose functions
- `destroy()`

## Theming

Import `@anil-labs/file-picker-core/styles.css`, then set the `theme` option (`'light' | 'dark' | 'auto'`) or override the `--fp-*` CSS custom properties (or add `.fp--dark` / `.fp--light`).

## Documentation

Full guides + the adapter contract + the complete API: **<https://anilkumarthakur60.github.io/file-picker/>**

## License

MIT © Er. Anil Kumar Thakur
