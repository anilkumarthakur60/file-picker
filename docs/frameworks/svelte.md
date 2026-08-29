# Svelte

`@anil-labs/file-picker-svelte` exposes the engine through `createFilePicker`, which returns Svelte
**stores** for the selection and open state.

## Install

```bash
npm i @anil-labs/file-picker-svelte
```

## Quick start

Because the engine renders to the DOM, create the controller in `onMount` and tear it down in
`onDestroy`. Use the returned `picker` to mount a trigger and a selected-thumbnails strip, and read
`selected` / `isOpen` as stores.

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { createFilePicker, type FilePickerController } from '@anil-labs/file-picker-svelte'
  import { createMemoryAdapter } from '@anil-labs/file-picker-core'
  import type { MediaItem } from '@anil-labs/file-picker-core'
  import '@anil-labs/file-picker-core/styles.css'

  let triggerEl: HTMLDivElement
  let selectedEl: HTMLDivElement
  let controller: FilePickerController
  let selected: MediaItem[] = []

  onMount(() => {
    controller = createFilePicker({
      adapter: createMemoryAdapter({ media: [], folders: [] }),
      multiple: true,
      onSelect: (items) => console.log('confirmed', items),
    })

    // Render the trigger button + live selected strip via the engine.
    controller.picker.mountTrigger(triggerEl, { label: 'Choose media' })
    controller.picker.mountSelected(selectedEl)

    // Mirror the `selected` store into local state.
    return controller.selected.subscribe((items) => (selected = items))
  })

  onDestroy(() => controller?.destroy())
</script>

<div bind:this={triggerEl}></div>
<div bind:this={selectedEl}></div>

<ul>
  {#each selected as item (item.id)}
    <li>{item.filename}</li>
  {/each}
</ul>
```

## `createFilePicker`

```ts
const controller = createFilePicker(options)
```

`options` is a [`FilePickerOptions`](/reference/api#options) object, plus optional `onSelect`,
`onChange` and `onUpload` callbacks.

### Returned controller

| Field | Type | Description |
| --- | --- | --- |
| `selected` | `Readable<MediaItem[]>` | The selection as a store (`$selected`). |
| `isOpen` | `Readable<boolean>` | Whether the dialog is open (`$isOpen`). |
| `open` | `() => void` | Open the dialog. |
| `close` | `() => void` | Close the dialog. |
| `setSelected` | `(items: MediaItem[] \| MediaItem \| null) => void` | Replace the selection. |
| `picker` | `FilePicker` | The underlying engine (use `mountTrigger` / `mountSelected`). |
| `destroy` | `() => void` | Tear down  call in `onDestroy`. |

::: tip Your own trigger
`mountTrigger` and `mountSelected` are optional  call `controller.open()` from any button of your
own instead.
:::
