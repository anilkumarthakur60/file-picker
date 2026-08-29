# @anil-labs/file-picker-solid

**SolidJS bindings for [`@anil-labs/file-picker`](https://github.com/anilkumarthakur60/file-picker)**  a media-library file picker with folders, upload, filters and metadata editing.

[![npm](https://img.shields.io/npm/v/@anil-labs/file-picker-solid?color=3b82f6&label=npm)](https://www.npmjs.com/package/@anil-labs/file-picker-solid)

## Install

```bash
npm i @anil-labs/file-picker-solid
```

## Quick start

```tsx
import { FilePicker } from '@anil-labs/file-picker-solid'
import { createMemoryAdapter } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const adapter = createMemoryAdapter({ media: [], folders: [] })

function Demo() {
  return <FilePicker adapter={adapter} multiple onSelect={(items) => console.log(items)} />
}
```

Or drive it with the primitive:

```tsx
import { useFilePicker } from '@anil-labs/file-picker-solid'

const { open, selected, isOpen } = useFilePicker({ adapter, multiple: true })
// `selected()` and `isOpen()` are accessors
```

## API

- `<FilePicker … />`  spreads all `FilePickerOptions` as props (`adapter` required), plus `label`, `showSelected`, and `onSelect` / `onChange` / `onUpload`.
- `useFilePicker(options)` → `{ selected (accessor), isOpen (accessor), open, close, setSelected, picker }`.

Cleans up on scope dispose. Peer: `solid-js ^1.8`.

## Documentation

**<https://anilkumarthakur60.github.io/file-picker/frameworks/solid>**

## License

MIT © Er. Anil Kumar Thakur
