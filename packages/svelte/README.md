# @anil-labs/file-picker-svelte

**Svelte bindings for [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)**  a media-library file picker with folders, upload, filters and metadata editing.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-svelte?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-svelte)

## Install

```bash
npm i @anil-labs/file-picker-svelte
```

## Quick start

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createFilePicker } from '@anil-labs/file-picker-svelte'
  import { createMemoryAdapter } from '@anil-labs/file-picker-core'
  import '@anil-labs/file-picker-core/styles.css'

  let trigger: HTMLElement
  let ctrl: ReturnType<typeof createFilePicker>

  onMount(() => {
    ctrl = createFilePicker({
      adapter: createMemoryAdapter({ media: [], folders: [] }),
      multiple: true,
      onSelect: (items) => console.log(items),
    })
    ctrl.picker.mountTrigger(trigger, { label: 'Choose media' })
  })
  onDestroy(() => ctrl?.destroy())
</script>

<div bind:this={trigger}></div>
```

## API

`createFilePicker(options)` returns:

- `selected`  a readable store of `MediaItem[]` (`$selected`)
- `isOpen`  a readable boolean store
- `open()` / `close()` / `setSelected(items)`
- `picker`  the underlying engine (use `.mountTrigger` / `.mountSelected`)
- `destroy()`  call in `onDestroy`

The engine renders to the DOM, so create it inside `onMount`. Peer: `svelte ^4 || ^5`.

## Documentation

**<https://anilkumarthakur60.github.io/file-picker/frameworks/svelte>**

## License

MIT © Er. Anil Kumar Thakur
