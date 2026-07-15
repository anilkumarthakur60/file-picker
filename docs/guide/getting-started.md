# Getting Started

This page gets a working picker on screen in a few minutes using the built-in in-memory adapter, so
you don't need a backend yet.

## Install

Install the binding for your framework — the core engine comes with it as a dependency.

::: code-group

```bash [React]
npm i @anil-labs/file-picker-react
```

```bash [Vue]
npm i @anil-labs/file-picker-vue
```

```bash [Svelte]
npm i @anil-labs/file-picker-svelte
```

```bash [Solid]
npm i @anil-labs/file-picker-solid
```

```bash [Web Component]
npm i @anil-labs/file-picker-element
```

```bash [Vanilla / Core]
npm i @anil-labs/file-picker-core
```

:::

## Import the styles

The picker renders its own UI, so its stylesheet is **required**. Import it once, anywhere in your
app's entry:

```ts
import '@anil-labs/file-picker-core/styles.css'
```

## Create an adapter

The picker reads and writes media through an [adapter](/guide/adapters). For a first run — or for
demos and tests — use `createMemoryAdapter()`, which keeps everything in memory:

```ts
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import type { MediaItem, MediaFolder } from '@anil-labs/file-picker-core'

const folders: MediaFolder[] = [
  { id: 1, name: 'Photography' },
  { id: 2, name: 'Branding' },
]

const media: MediaItem[] = [
  {
    id: 10,
    folderId: 1,
    filename: 'sunrise.jpg',
    extension: 'jpg',
    mimeType: 'image/jpeg',
    type: 'image',
    alt: 'Sunrise over the hills',
    size: 812_000,
    src: 'https://picsum.photos/id/10/600/400',
    tags: ['nature', 'warm'],
  },
]

const adapter = createMemoryAdapter({ media, folders, latency: 300 })
```

When you're ready for a real backend, swap in [`createRestAdapter()`](/guide/adapters#createrestadapter)
or [implement your own](/guide/adapters#implement-your-own-adapter) — nothing else changes.

## Render your first picker

::: code-group

```tsx [React]
import { FilePicker } from '@anil-labs/file-picker-react'
import '@anil-labs/file-picker-core/styles.css'

export function App() {
  return (
    <FilePicker
      adapter={adapter}
      multiple
      label="Choose media"
      onSelect={(items) => console.log('confirmed', items)}
    />
  )
}
```

```vue [Vue]
<script setup lang="ts">
import { FilePicker } from '@anil-labs/file-picker-vue'
import '@anil-labs/file-picker-core/styles.css'
</script>

<template>
  <FilePicker
    :options="{ adapter, multiple: true }"
    label="Choose media"
    @select="(items) => console.log('confirmed', items)"
  />
</template>
```

```ts [Vanilla]
import { FilePicker } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const picker = new FilePicker({ adapter, multiple: true, title: 'Media Library' })
picker.mountTrigger(document.querySelector('#trigger')!, { label: 'Choose media' })
picker.on('select', (items) => console.log('confirmed', items))
```

```html [Web Component]
<file-picker multiple label="Choose media"></file-picker>

<script type="module">
  import '@anil-labs/file-picker-element'
  import '@anil-labs/file-picker-core/styles.css'

  const el = document.querySelector('file-picker')
  el.adapter = adapter
  el.addEventListener('fp:select', (e) => console.log('confirmed', e.detail))
</script>
```

:::

That's it — a trigger button that opens the media library, lets the user browse folders, upload,
filter, edit and select, and hands you the chosen `MediaItem[]` on `select`.

## Next steps

- [Adapters](/guide/adapters) — connect a real backend.
- [Frameworks](/frameworks/react) — the idiomatic quick start and API for each binding.
- [Features](/guide/features) — everything the picker can do.
- [Theming](/guide/theming) — light / dark / auto and custom colors.
