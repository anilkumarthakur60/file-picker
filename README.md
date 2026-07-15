# @anil-labs/file-picker

**A framework-agnostic _media-library_ file picker — folders, upload, search & type filters, metadata editing and single/multi selection. One engine, five framework bindings.**

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-core?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-core)
[![CI](https://github.com/anilkumarthakur60/file-picker/actions/workflows/ci.yml/badge.svg)](https://github.com/anilkumarthakur60/file-picker/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

The core renders its own themeable UI (zero runtime dependencies) and stays **decoupled from your
backend** through a small **adapter**. Implement `FilePickerAdapter`, or drop in the built-in
`createRestAdapter()` (any REST API) or `createMemoryAdapter()` (in-memory). Every framework binding
is a thin wrapper over the same engine.

- 🗂️ **Folders** — browse, create, rename, delete (files move to Uncategorized on delete)
- 📤 **Upload** — click or drag & drop, choose the destination folder
- 🔎 **Filters** — search, tag, and type (image / video / audio / pdf / doc / …) + pagination
- ✏️ **Editing** — alt text, tags, and folder, saved per-field
- 🖼️ **Preview** — image lightbox; open PDFs/docs in a new tab
- ✅ **Selection** — single or multi, with shift-click range and a selected-thumbnails strip
- 🔌 **Backend-agnostic** — one `FilePickerAdapter` interface; REST & in-memory adapters included
- 🎨 **Own UI** — one `styles.css`, light / dark / auto theming via CSS variables
- 🧩 **Bindings** — React, Vue, Svelte, Solid, a Web Component — plus the raw core
- 🎯 **TypeScript** — zero `any`; the core has zero runtime dependencies

📖 **[Documentation](https://anilkumarthakur60.github.io/file-picker/)** · 🚀 **[Live demos](https://anil-labs-file-picker.vercel.app)**

## Install

Install the binding for your framework — the core comes with it.

```bash
npm i @anil-labs/file-picker-react     # or -vue / -svelte / -solid / -element
npm i @anil-labs/file-picker-core      # vanilla / your own UI
```

## The adapter is the key idea

The picker never talks to your backend directly — you hand it an adapter:

```ts
import { createRestAdapter } from '@anil-labs/file-picker-core'

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com/',
  headers: () => ({ Authorization: `Bearer ${token}` }),
})
```

Prototyping, or no backend yet? Use the in-memory adapter:

```ts
import { createMemoryAdapter } from '@anil-labs/file-picker-core'

const adapter = createMemoryAdapter({ media: [...], folders: [...] })
```

…or implement the eight-method [`FilePickerAdapter`](https://anilkumarthakur60.github.io/file-picker/guide/adapters)
against anything (GraphQL, Firebase, S3, your own API).

## Quick start

```tsx
// React
import { FilePicker } from '@anil-labs/file-picker-react'
import '@anil-labs/file-picker-core/styles.css'

;<FilePicker adapter={adapter} multiple onSelect={(items) => console.log(items)} />
```

```ts
// Vanilla
import { FilePicker } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const picker = new FilePicker({ adapter, multiple: true })
picker.on('select', (items) => console.log(items))
picker.open()
```

## Framework bindings

| Framework | Package | Highlights |
| --- | --- | --- |
| **React** | `@anil-labs/file-picker-react` | `<FilePicker>` + `useFilePicker` |
| **Vue 3** | `@anil-labs/file-picker-vue` | `<FilePicker>` + `useFilePicker` |
| **Svelte** | `@anil-labs/file-picker-svelte` | `createFilePicker` (stores) |
| **Solid** | `@anil-labs/file-picker-solid` | `<FilePicker>` + `useFilePicker` |
| **Web Component** | `@anil-labs/file-picker-element` | `<file-picker>` — any framework or plain HTML |

## Monorepo layout

```
packages/   core + react/vue/svelte/solid/element
examples/   one Vite app per binding (in-memory adapter — the deployed demos)
docs/       VitePress documentation site
```

Built with pnpm workspaces, tsup (ESM + CJS + IIFE + `.d.ts`), Vitest, type-aware ESLint (zero
`any`), Prettier and Changesets. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

[MIT](./LICENSE) © Er. Anil Kumar Thakur
