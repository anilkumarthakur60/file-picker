# @anil-labs/file-picker-react

**React bindings for [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)** — a media-library file picker with folders, upload, filters and metadata editing.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-react?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-react)

## Install

```bash
npm i @anil-labs/file-picker-react
```

## Quick start

```tsx
import { FilePicker } from '@anil-labs/file-picker-react'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const adapter = createMemoryAdapter({ media: [], folders: [] })

export function Demo() {
  return <FilePicker adapter={adapter} multiple onSelect={(items) => console.log(items)} />
}
```

Prefer full control? Drive it with the hook and render your own trigger:

```tsx
import { useFilePicker } from '@anil-labs/file-picker-react'

function Picker() {
  const { open, selected, isOpen } = useFilePicker({ adapter, multiple: true })
  return <button onClick={open}>Pick media ({selected.length})</button>
}
```

## API

- `<FilePicker … />` — spreads all [`FilePickerOptions`](https://anilkumarthakur60.github.io/file-picker/reference/api) as props (`adapter` required), plus `label`, `showSelected`, `children` (custom trigger), and `onSelect` / `onChange` / `onUpload`.
- `useFilePicker(options)` → `{ picker, selected, isOpen, open, close, setSelected }`.

Cleanup is automatic on unmount, and the package ships a `'use client'` banner so it works in the
Next.js App Router. Peer: `react >= 17`.

## Documentation

**<https://anilkumarthakur60.github.io/file-picker/frameworks/react>**

## License

MIT © Er. Anil Kumar Thakur
