# React

`@anil-labs/file-picker-react` wraps the core engine in a hook and a component. It ships with a
`'use client'` banner, so it works in React Server Component setups (Next.js App Router) out of the
box.

## Install

```bash
npm i @anil-labs/file-picker-react
```

## Quick start

The `<FilePicker>` component renders a ready-made trigger and selected-thumbnails strip. Options are
passed as props:

```tsx
import { FilePicker } from '@anil-labs/file-picker-react'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const adapter = createMemoryAdapter({ media: [], folders: [] })

export function App() {
  return (
    <FilePicker
      adapter={adapter}
      multiple
      title="Media Library"
      label="Choose media"
      showSelected
      onSelect={(items) => console.log('confirmed', items)}
      onChange={(items) => console.log('selection changed', items)}
      onUpload={(items) => console.log('uploaded', items)}
    />
  )
}
```

### `<FilePicker>` props

The component spreads all [`FilePickerOptions`](/reference/api#options) (`adapter`, `multiple`,
`title`, `theme`, `perPage`, …) plus:

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `label` | `string` | `'Select File'` | Trigger label (ignored when `children` is provided). |
| `children` | `ReactNode` |  | Custom trigger content; clicking it opens the picker. |
| `showSelected` | `boolean` | `true` | Render the selected-thumbnails strip. |
| `wrapperClass` | `string` |  | Class for the wrapper element. |
| `onSelect` | `(items: MediaItem[]) => void` |  | Fires when the user confirms with **Done**. |
| `onChange` | `(items: MediaItem[]) => void` |  | Fires on every selection change. |
| `onUpload` | `(items: MediaItem[]) => void` |  | Fires after an upload completes. |

Provide `children` to use your own trigger:

```tsx
<FilePicker adapter={adapter} onSelect={handleSelect}>
  <button className="my-btn">Pick an image</button>
</FilePicker>
```

## `useFilePicker`

For full control, use the hook and render your own UI. It creates the picker on mount (client-only)
and destroys it on unmount, mirroring the selection into React state.

```tsx
import { useFilePicker } from '@anil-labs/file-picker-react'

function Gallery() {
  const { open, selected, isOpen, setSelected } = useFilePicker({
    adapter,
    multiple: true,
    onSelect: (items) => console.log('confirmed', items),
  })

  return (
    <div>
      <button onClick={open}>Open library {isOpen ? '(open)' : ''}</button>
      <ul>
        {selected.map((item) => (
          <li key={item.id}>{item.filename}</li>
        ))}
      </ul>
      <button onClick={() => setSelected(null)}>Clear</button>
    </div>
  )
}
```

### Returned controller

| Field | Type | Description |
| --- | --- | --- |
| `picker` | `FilePicker \| null` | The underlying engine (null until mounted on the client). |
| `selected` | `MediaItem[]` | The current selection (reactive state). |
| `isOpen` | `boolean` | Whether the dialog is open. |
| `open` | `() => void` | Open the dialog. |
| `close` | `() => void` | Close the dialog. |
| `setSelected` | `(items: MediaItem[] \| MediaItem \| null) => void` | Replace the selection. |

The hook also accepts `onSelect`, `onChange` and `onUpload` callbacks alongside the standard options.
