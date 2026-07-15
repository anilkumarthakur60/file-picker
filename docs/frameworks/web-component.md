# Web Component

`@anil-labs/file-picker-element` registers a `<file-picker>` custom element — usable in any framework
or in plain HTML, with no build step. Importing the package auto-registers the element.

## Install

```bash
npm i @anil-labs/file-picker-element
```

Or load it straight from a CDN — the package ships an IIFE build (`unpkg` / `jsdelivr`):

```html
<script src="https://cdn.jsdelivr.net/npm/@anil-labs/file-picker-element"></script>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@anil-labs/file-picker-core/dist/styles.css" />
```

## Quick start

Configure the element with **attributes**, set the required `adapter` as a **JS property** (it's an
object, not a string), and listen for `fp:*` **events** — where `event.detail` is the `MediaItem[]`
array.

```html
<file-picker multiple label="Choose media" title="Media Library"></file-picker>

<script type="module">
  import '@anil-labs/file-picker-element'
  import '@anil-labs/file-picker-core/styles.css'
  import { createMemoryAdapter } from '@anil-labs/file-picker-core'

  const el = document.querySelector('file-picker')

  // The adapter is an object → set it as a property, not an attribute.
  el.adapter = createMemoryAdapter({ media: [], folders: [] })

  el.addEventListener('fp:select', (e) => console.log('confirmed', e.detail))
  el.addEventListener('fp:change', (e) => console.log('changed', e.detail))
  el.addEventListener('fp:upload', (e) => console.log('uploaded', e.detail))
</script>
```

## Attributes

| Attribute | Type | Description |
| --- | --- | --- |
| `multiple` | boolean | Allow selecting more than one item (present = on). |
| `label` | string | Trigger button label (default `Select File`). |
| `title` | string | Dialog title. |
| `theme` | `light` \| `dark` \| `auto` | Color theme (default `auto`). |
| `per-page` | number | Items per page. |
| `show-selected` | string | Set to `false` to hide the selected-thumbnails strip. |

Attributes are reactive — changing one rebuilds the picker with the new configuration.

## Property

| Property | Type | Description |
| --- | --- | --- |
| `adapter` | `FilePickerAdapter \| null` | **Required.** The data source. Set as a JS property. |

```js
document.querySelector('file-picker').adapter = myAdapter
```

## Events

Every event's `detail` is the `MediaItem[]` array. Events bubble.

| Event | `detail` | Fires when |
| --- | --- | --- |
| `fp:select` | `MediaItem[]` | The user confirms with **Done**. |
| `fp:change` | `MediaItem[]` | The selection changes. |
| `fp:upload` | `MediaItem[]` | An upload completes. |

## Methods & getters

| Member | Description |
| --- | --- |
| `openPicker()` | Open the dialog. |
| `closePicker()` | Close the dialog. |
| `selected` | Getter — the current selection as `MediaItem[]`. |
| `picker` | Getter — the underlying `FilePicker` engine (once built). |

```js
const el = document.querySelector('file-picker')
el.openPicker()
console.log(el.selected)
```

## Using it inside a framework

Because it's a standard custom element, `<file-picker>` drops into any framework's template. Set
`adapter` via a property binding (or an effect / `ref`) and listen for the `fp:*` events. For deep
framework integration, the dedicated [React](/frameworks/react), [Vue](/frameworks/vue),
[Svelte](/frameworks/svelte) and [Solid](/frameworks/solid) bindings offer idiomatic hooks and
components.
