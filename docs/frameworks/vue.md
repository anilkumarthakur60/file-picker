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
| `options` | `FilePickerOptions` |  (required) | The picker options (`adapter`, `multiple`, `title`, `theme`, …). |
| `v-model` | `MediaItem[] \| MediaItem \| null` |  | Two-way selection binding. Takes precedence over `options.selected`. |
| `label` | `string` | `'Select File'` | Trigger label. |
| `showSelected` | `boolean` | `true` | Render the selected-thumbnails strip. |

| Event | Payload |
| --- | --- |
| `@update:modelValue` | `MediaItem[]`  the `v-model` write-back (fires with `@change`). |
| `@select` | `MediaItem[]`  the user confirmed with **Done**. |
| `@change` | `MediaItem[]`  the selection changed. |
| `@upload` | `MediaItem[]`  an upload completed. |

### `v-model`

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { FilePicker, type MediaItem } from '@anil-labs/file-picker-vue'

const selectedMedia = ref<MediaItem[]>([])
</script>

<template>
  <FilePicker v-model="selectedMedia" :options="{ adapter, multiple: true }" />
</template>
```

`v-model` is **always emitted as `MediaItem[]`**, in single and multiple mode alike, so its type
doesn't shift when `options.multiple` changes. On the way in it also accepts a bare `MediaItem` or
`null` (to clear).

#### Binding IDs instead of items

You cannot `v-model` an array of IDs. `MediaItem[]` → `number[]` is lossy, and nothing can rebuild
the items from IDs  `FilePickerAdapter` lists media by query, not by ID. Keep the items as the
source of truth and derive the IDs for your form:

```vue
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { FilePicker, type MediaItem } from '@anil-labs/file-picker-vue'

const formData = reactive({ title: '', alt: '', media_ids: [] as number[] })
const selectedMedia = ref<MediaItem[]>([])

// One writable computed keeps both in step, without a watcher.
const mediaModel = computed({
  get: () => selectedMedia.value,
  set: (items: MediaItem[]) => {
    selectedMedia.value = items
    formData.media_ids = items.map((i) => Number(i.id))
  },
})
</script>

<template>
  <form>
    <label class="field">
      <span>Title</span>
      <input name="title" v-model="formData.title" />
    </label>

    <label class="field">
      <span>Alt text</span>
      <input name="alt" placeholder="Describe the media" v-model="formData.alt" />
    </label>

    <FilePicker v-model="mediaModel" :options="{ adapter, multiple: true }" />

    <!-- For a plain (non-fetch) form post, mirror the ids as repeated fields. -->
    <input v-for="id in formData.media_ids" :key="id" type="hidden" name="mediaIds[]" :value="id" />
  </form>
</template>
```

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
