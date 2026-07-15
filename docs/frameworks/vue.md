# Vue

`@anil-labs/file-picker-vue` wraps the core engine as a Vue 3 composable and component.

## Install

```bash
npm i @anil-labs/file-picker-vue
```

## Quick start

The `<FilePicker>` component renders a ready-made trigger and selected-thumbnails strip. Options are
passed as a single `options` object; selection events are emitted:

```vue
<script setup lang="ts">
import { FilePicker } from '@anil-labs/file-picker-vue'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import type { MediaItem } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const adapter = createMemoryAdapter({ media: [], folders: [] })

function onSelect(items: MediaItem[]) {
  console.log('confirmed', items)
}
</script>

<template>
  <FilePicker
    :options="{ adapter, multiple: true, title: 'Media Library' }"
    label="Choose media"
    @select="onSelect"
    @change="(items) => console.log('changed', items)"
    @upload="(items) => console.log('uploaded', items)"
  />
</template>
```

### `<FilePicker>` props & events

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `options` | `FilePickerOptions` | — (required) | The picker options (`adapter`, `multiple`, `title`, `theme`, …). |
| `label` | `string` | `'Select File'` | Trigger label. |
| `showSelected` | `boolean` | `true` | Render the selected-thumbnails strip. |

| Event | Payload |
| --- | --- |
| `@select` | `MediaItem[]` — the user confirmed with **Done**. |
| `@change` | `MediaItem[]` — the selection changed. |
| `@upload` | `MediaItem[]` — an upload completed. |

Use the default slot to provide your own trigger:

```vue
<FilePicker :options="{ adapter }" @select="onSelect">
  <button class="my-btn">Pick an image</button>
</FilePicker>
```

## `useFilePicker`

For full control, use the composable. It creates the picker on mount and cleans up when the scope
unmounts, exposing reactive refs.

```vue
<script setup lang="ts">
import { useFilePicker } from '@anil-labs/file-picker-vue'

const { open, close, selected, isOpen, setSelected } = useFilePicker({
  adapter,
  multiple: true,
  onSelect: (items) => console.log('confirmed', items),
})
</script>

<template>
  <button @click="open">Open library {{ isOpen ? '(open)' : '' }}</button>
  <ul>
    <li v-for="item in selected" :key="item.id">{{ item.filename }}</li>
  </ul>
  <button @click="setSelected(null)">Clear</button>
</template>
```

### Returned controller

| Field | Type | Description |
| --- | --- | --- |
| `picker` | `Ref<FilePicker \| null>` | The underlying engine. |
| `selected` | `Ref<MediaItem[]>` | The current selection. |
| `isOpen` | `Ref<boolean>` | Whether the dialog is open. |
| `open` | `() => void` | Open the dialog. |
| `close` | `() => void` | Close the dialog. |
| `setSelected` | `(items: MediaItem[] \| MediaItem \| null) => void` | Replace the selection. |

The composable also accepts `onSelect`, `onChange` and `onUpload` callbacks alongside the standard
options.
