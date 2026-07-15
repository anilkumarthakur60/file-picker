# Introduction

**@anil-labs/file-picker** is a framework-agnostic _media-library_ file picker. It renders its own
dialog UI — a browsable grid of media with folders, upload, search and type filters, metadata
editing and single/multi selection — and stays completely decoupled from your backend through a
small **adapter**.

One engine (`@anil-labs/file-picker-core`) powers thin bindings for React, Vue, Svelte, Solid, and a
`<file-picker>` Web Component, plus the raw core for vanilla JavaScript.

## How it fits together

```
@anil-labs/file-picker-core      the engine — renders the UI, owns the state
        │
        ├── FilePickerAdapter    your data source (REST, in-memory, or your own)
        │
        └── bindings             thin wrappers over the same engine
              ├── -react
              ├── -vue
              ├── -svelte
              ├── -solid
              └── -element        the <file-picker> custom element
```

The core is responsible for _everything the user sees and does_: the modal, the grid, pagination,
filters, the upload and edit dialogs, the image preview lightbox, and selection. Your job is to
answer a handful of data questions — "list this page of media", "upload these files", "rename this
folder" — through the adapter.

## The adapter is the key idea

The picker never calls your API directly. You hand it an object that implements the
[`FilePickerAdapter`](/guide/adapters) interface, and the engine calls its methods as the user
navigates:

```ts
import { FilePicker } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const picker = new FilePicker({ adapter, multiple: true })
picker.on('select', (items) => console.log(items))
picker.open()
```

That single seam is what makes the picker backend-agnostic. Point the built-in
[`createRestAdapter()`](/guide/adapters#createrestadapter) at any JSON API, use
[`createMemoryAdapter()`](/guide/adapters#creatememoryadapter) for demos and tests, or implement the
eight-method interface against GraphQL, Firebase, S3 — anything.

## What you get

- 🗂️ **Folders** — browse, create, rename, delete (files move to Uncategorized when a folder is deleted).
- 📤 **Upload** — click or drag & drop, with a destination-folder picker.
- 🔎 **Filters** — search, tag and type (image / video / audio / pdf / document / …) plus pagination.
- ✏️ **Editing** — filename, alt text, tags and folder, saved per field.
- 🖼️ **Preview** — an image lightbox; other files open in a new tab.
- ✅ **Selection** — single or multi, with shift-click range selection and a selected-thumbnails strip.
- 🎨 **Own UI** — one stylesheet, light / dark / auto theming via CSS variables.
- 🎯 **TypeScript** — a fully-typed API with no `any`; the core has zero runtime dependencies.

## Next steps

- [Getting Started](/guide/getting-started) — install and render your first picker.
- [Adapters](/guide/adapters) — the contract, the built-in adapters, and implementing your own.
- [Features](/guide/features) — a tour of folders, upload, editing, selection, filters and preview.
- [API Reference](/reference/api) — every option, method, event and type.
