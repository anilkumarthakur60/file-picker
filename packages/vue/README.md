# @anil-labs/file-picker-vue

**Vue 3 bindings for [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)** — a media-library file picker with folders, upload, filters and metadata editing.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-vue?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-vue)

## Install

```bash
npm i @anil-labs/file-picker-vue
```

## Quick start

```vue
<script setup lang="ts">
import { FilePicker } from '@anil-labs/file-picker-vue'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'
import type { MediaItem } from '@anil-labs/file-picker-core'

const adapter = createMemoryAdapter({ media: [], folders: [] })
const onSelect = (items: MediaItem[]) => console.log(items)
</script>

<template>
  <FilePicker :options="{ adapter, multiple: true }" label="Choose media" @select="onSelect" />
</template>
```

Or drive it with the composable:

```ts
import { useFilePicker } from '@anil-labs/file-picker-vue'

const { open, selected, isOpen } = useFilePicker({ adapter, multiple: true })
```

## API

- `<FilePicker :options label show-selected @select @change @upload />` — `options` is a `FilePickerOptions` object (`adapter` required).
- `useFilePicker(options)` → `{ picker, selected (ref), isOpen (ref), open, close, setSelected }`.

Cleans up automatically on scope dispose. Peer: `vue ^3.3`.

## Documentation

**<https://anilkumarthakur60.github.io/file-picker/frameworks/vue>**

## License

MIT © Er. Anil Kumar Thakur
