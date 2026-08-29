# Solid

`@anil-labs/file-picker-solid` wraps the core engine in a Solid hook and component. Reactive values
are exposed as **accessors** (call them as functions: `selected()`).

## Install

```bash
npm i @anil-labs/file-picker-solid
```

## Quick start

The `<FilePicker>` component renders a ready-made trigger and selected-thumbnails strip. Options are
passed as props:

```tsx
import { FilePicker } from '@anil-labs/file-picker-solid'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const adapter = createMemoryAdapter({ media: [], folders: [] })

export function App() {
  return (
    <FilePicker
      adapter={adapter}
      multiple
      label="Choose media"
      onSelect={(items) => console.log('confirmed', items)}
      onChange={(items) => console.log('changed', items)}
      onUpload={(items) => console.log('uploaded', items)}
    />
  )
}
```

### `<FilePicker>` props

The component spreads all [`FilePickerOptions`](/reference/api#options) (`adapter`, `multiple`,
`title`, `theme`, …) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `'Select File'` | Trigger label. |
| `showSelected` | `boolean` | `true` | Render the selected-thumbnails strip. |
| `onSelect` | `(items: MediaItem[]) => void` |  | Fires when the user confirms with **Done**. |
| `onChange` | `(items: MediaItem[]) => void` |  | Fires on every selection change. |
| `onUpload` | `(items: MediaItem[]) => void` |  | Fires after an upload completes. |

## `useFilePicker`

For full control, use the hook and render your own UI. It creates the picker on mount and cleans up
on scope dispose; reactive values are accessors.

```tsx
import { useFilePicker } from '@anil-labs/file-picker-solid'
import { For } from 'solid-js'

function Gallery() {
  const { open, selected, isOpen, setSelected } = useFilePicker({
    adapter,
    multiple: true,
    onSelect: (items) => console.log('confirmed', items),
  })

  return (
    <div>
      <button onClick={open}>Open library {isOpen() ? '(open)' : ''}</button>
      <ul>
        <For each={selected()}>{(item) => <li>{item.filename}</li>}</For>
      </ul>
      <button onClick={() => setSelected(null)}>Clear</button>
    </div>
  )
}
```

### Returned controller

| Field | Type | Description |
| --- | --- | --- |
| `selected` | `Accessor<MediaItem[]>` | The current selection  call it: `selected()`. |
| `isOpen` | `Accessor<boolean>` | Whether the dialog is open  `isOpen()`. |
| `open` | `() => void` | Open the dialog. |
| `close` | `() => void` | Close the dialog. |
| `setSelected` | `(items: MediaItem[] \| MediaItem \| null) => void` | Replace the selection. |
| `picker` | `FilePicker \| null` | The underlying engine. |

The hook also accepts `onSelect`, `onChange` and `onUpload` callbacks alongside the standard options.
