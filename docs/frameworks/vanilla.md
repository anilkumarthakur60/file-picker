# Vanilla / Core

`@anil-labs/file-picker-core` is the engine every binding wraps. Use it directly in plain JavaScript
or TypeScript — no framework required.

## Install

```bash
npm i @anil-labs/file-picker-core
```

## Quick start

```ts
import { FilePicker, createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const picker = new FilePicker({
  adapter: createMemoryAdapter({ media: [], folders: [] }),
  multiple: true,
  title: 'Media Library',
})

// Mount a ready-made trigger button, and a live selected-thumbnails strip.
picker.mountTrigger(document.querySelector('#trigger')!, { label: 'Choose media' })
picker.mountSelected(document.querySelector('#selected')!)

picker.on('select', (items) => console.log('confirmed', items))
picker.on('change', (items) => console.log('selection changed', items))
```

```html
<div id="trigger"></div>
<div id="selected"></div>
```

You don't have to use `mountTrigger` — call `picker.open()` from any button of your own.

## Options

Pass a [`FilePickerOptions`](/reference/api#options) object to the constructor. The only required
field is `adapter`:

```ts
const picker = new FilePicker({
  adapter,
  multiple: false,
  selected: null,
  perPage: 24,
  perPageOptions: [12, 24, 48, 96],
  theme: 'auto',
  title: 'Media Library',
  accept: 'image/*',
  manageFolders: true,
  allowUpload: true,
  allowEdit: true,
  allowDelete: true,
})
```

## Methods

| Method | Description |
| --- | --- |
| `open()` | Open the dialog. |
| `close()` | Close the dialog. |
| `get isOpen` | Whether the dialog is open. |
| `getSelected()` | The current selection as `MediaItem[]`. |
| `setSelected(items)` | Replace the selection (`MediaItem[] \| MediaItem \| null`). |
| `on(event, handler)` | Subscribe; returns an unsubscribe function. |
| `mountTrigger(el, { label? })` | Render a trigger button into `el`; returns a dispose function. |
| `mountSelected(el)` | Render a live selected-thumbnails strip into `el`; returns a dispose function. |
| `destroy()` | Tear down the instance and remove its DOM. |

## Events

Subscribe with `on(event, handler)`, which returns an unsubscribe function:

```ts
const off = picker.on('upload', (items) => console.log(items))
// later…
off()
```

| Event | Payload |
| --- | --- |
| `open` | — |
| `close` | — |
| `change` | `MediaItem[]` |
| `select` | `MediaItem[]` |
| `upload` | `MediaItem[]` |
| `delete` | `MediaItem` |
| `error` | `unknown` |

## Cleanup

When you're done with a picker instance, call `destroy()` to remove its DOM and listeners:

```ts
picker.destroy()
```

See the [full API reference](/reference/api) for every option, method, event and type.
