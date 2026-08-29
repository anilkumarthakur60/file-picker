# API Reference

The complete public API of `@anil-labs/file-picker-core`. The framework bindings wrap the
`FilePicker` class documented here  see the [Frameworks](/frameworks/vanilla) section for their
hooks and components.

```ts
import {
  FilePicker,
  createMemoryAdapter,
  createRestAdapter,
} from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'
```

## `new FilePicker(options)`

```ts
const picker = new FilePicker(options)
```

### Options

`FilePickerOptions`  only `adapter` is required.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `adapter` | `FilePickerAdapter` |  (required) | The data source. See [Adapters](/guide/adapters). |
| `multiple` | `boolean` | `false` | Allow selecting more than one item. |
| `selected` | `MediaItem[] \| MediaItem \| null` | `null` | Initially-selected item(s). |
| `perPage` | `number` | `20` | Items per page. A value outside `perPageOptions` is folded into the selector so it always shows the real page size. |
| `perPageOptions` | `number[]` | `[10, 20, 50, 100, 200]` | Choices in the "per page" selector. |
| `typeFilters` | `TypeFilterOption[]` | built-in set | Type-filter dropdown options. |
| `theme` | `'light' \| 'dark' \| 'auto'` | `'auto'` | Color theme (switchable at runtime  see `setTheme`). The picker renders no theme toggle of its own; drive it from your app. |
| `className` | `string` | `''` | Extra class on the picker root. |
| `title` | `string` | `'Media Library'` | Dialog title. |
| `accept` | `string` | `''` | `accept` attribute for the upload input. |
| `manageFolders` | `boolean` | `true` | Show folder create / rename / delete controls. |
| `allowUpload` | `boolean` | `true` | Show the upload UI. |
| `allowEdit` | `boolean` | `true` | Show the edit dialog. |
| `allowDelete` | `boolean` | `true` | Show per-item delete. |
| `searchDebounce` | `number` | `400` | Debounce (ms) for the search and tag inputs. |
| `closeOnSelect` | `boolean` | `!multiple` | In single-select, confirm and close as soon as an item is picked. |
| `maxSelection` | `number` |  (no limit) | Cap on how many items can be selected in `multiple` mode. |
| `fileIcons` | `Record<string, string>` | `{}` | Override per-type icon keys, merged over the built-ins (e.g. `{ video: 'film' }`). |
| `fileColors` | `Record<string, string>` | `{}` | Override per-type accent colors, merged over the built-ins. |
| `labels` | `Partial<FilePickerLabels>` | built-in (English) | Override any user-facing string. See [Localization](#localization). |
| `layout` | `'fullscreen' \| 'modal'` | `'fullscreen'` | Dialog layout: full-screen, or a centered modal card on desktop. |
| `renderEmpty` | `() => string` |  | Replace the empty-library markup (returns trusted HTML). |
| `renderLoading` | `() => string` |  | Replace the first-load loading markup (returns trusted HTML). |
| `renderCardMeta` | `(item: MediaItem) => string` |  | Replace a card's meta line  e.g. show dimensions or a date (returns trusted HTML). |
| `headerActions` | `HTMLElement[]` |  | Extra buttons to mount in the header toolbar. |

### Methods

| Method | Signature | Description |
| --- | --- | --- |
| `open` | `(): void` | Open the dialog. |
| `close` | `(): void` | Close the dialog. |
| `isOpen` | `get (): boolean` | Whether the dialog is open. |
| `getSelected` | `(): MediaItem[]` | The current selection. |
| `setSelected` | `(value: MediaItem[] \| MediaItem \| null): void` | Replace the selection. |
| `setTheme` | `(theme: 'light' \| 'dark' \| 'auto'): void` | Switch the color theme at runtime. |
| `resolvedTheme` | `get (): 'light' \| 'dark'` | The effective theme (resolves `'auto'` against the OS). |
| `on` | `(event, handler): () => void` | Subscribe; returns an unsubscribe function. |
| `mountTrigger` | `(el: HTMLElement, opts?: { label?: string }): () => void` | Render a trigger button into `el`; returns a dispose function. |
| `mountSelected` | `(el: HTMLElement): () => void` | Render a live selected-thumbnails strip into `el`; returns a dispose function. |
| `destroy` | `(): void` | Tear down the instance and remove its DOM. |

### Events

Subscribe with `on(event, handler)`. The handler's arguments are shown below; `on` returns a function
that unsubscribes.

| Event | Handler arguments | Fires when |
| --- | --- | --- |
| `open` | `()` | The dialog opened. |
| `close` | `()` | The dialog closed  via the footer **Cancel**, the header close (✕), Esc, or after confirming with **Select N**. |
| `change` | `(items: MediaItem[])` | The selection changed (any add / remove / clear). |
| `select` | `(items: MediaItem[])` | The selection was confirmed with the footer **Select N** button (labelled **Done** when nothing is picked). |
| `upload` | `(items: MediaItem[])` | Files finished uploading. |
| `delete` | `(item: MediaItem)` | An item was deleted. |
| `error` | `(error: unknown)` | An adapter operation threw. |
| `theme` | `(theme: 'light' \| 'dark' \| 'auto')` | The color theme changed. |

```ts
const off = picker.on('select', (items) => console.log(items))
off() // unsubscribe
```

### Localization

Every user-facing string is overridable through the `labels` option  pass a
`Partial<FilePickerLabels>` to translate or reword the UI for i18n / white-labeling. Only the keys
you supply are replaced; the rest fall back to the built-in English set. Most entries take a plain
string; the few that interpolate a count or name are functions.

```ts
new FilePicker({
  adapter,
  labels: {
    title: 'Médiathèque',
    upload: 'Téléverser',
    selectAction: (n) => (n > 0 ? `Choisir ${n}` : 'Terminé'),
  },
})
```

## Adapters

| Factory | Description |
| --- | --- |
| `createMemoryAdapter(seed?)` | An in-memory adapter for demos and tests. |
| `createRestAdapter(config)` | A configurable REST client (Laravel-style defaults). |

See the [Adapters guide](/guide/adapters) for the `FilePickerAdapter` contract, full configuration
and a worked "implement your own" example.

### `FilePickerAdapter`

```ts
interface FilePickerAdapter {
  listMedia(query: MediaQuery): Promise<MediaPage>
  deleteMedia(id: MediaId): Promise<void>
  updateMedia(id: MediaId, patch: Partial<MediaEditForm>): Promise<MediaItem>
  uploadMedia(files: File[], opts: { folderId: MediaId | null }): Promise<MediaItem[]>
  listFolders(): Promise<MediaFolder[]>
  createFolder(name: string): Promise<MediaFolder>
  renameFolder(id: MediaId, name: string): Promise<MediaFolder>
  deleteFolder(id: MediaId): Promise<void>
}
```

## Types

```ts
type MediaId = string | number

type MediaType =
  | 'image'
  | 'vector'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'document'
  | 'spreadsheet'
  | 'presentation'
  | 'text'
  | 'other'

interface MediaItem {
  id: MediaId
  /** Owning folder id, or `null` for "Uncategorized". */
  folderId: MediaId | null
  filename: string
  extension: string
  mimeType: string
  /** High-level bucket; also accepts custom strings. */
  type: MediaType | (string & {})
  alt: string | null
  size: number
  /** URL to the file  used for thumbnails and the preview lightbox. */
  src: string
  tags: string[]
}

interface MediaFolder {
  id: MediaId
  name: string
  /** Optional count shown next to the folder. */
  mediaCount?: number
}

/** An id, the special `'uncategorized'`, or `null` for all folders. */
type FolderScope = MediaId | 'uncategorized' | null

interface MediaQuery {
  /** 1-based page number. */
  page: number
  perPage: number
  search?: string | null
  tag?: string | null
  /** Aggregate-type filter (`image`, `video`, …) or null for all. */
  type?: string | null
  folder?: FolderScope
}

interface MediaPage {
  items: MediaItem[]
  /** Total items across all pages (drives pagination). */
  total: number
  /** 1-based last page. Derived from `total` / `perPage` if omitted. */
  lastPage?: number
}

interface MediaEditForm {
  filename: string
  alt: string | null
  tags: string[]
  folderId: MediaId | null
}

interface TypeFilterOption {
  label: string
  value: string
  /** Icon key from the built-in icon set. */
  icon: string
  /** CSS color for the icon. */
  color: string
}
```

## Utilities

Helpers exported from the core, useful when mapping raw rows into `MediaItem`s or building custom UI.

| Export | Signature | Description |
| --- | --- | --- |
| `getFileIcon` | `(type: string) => string` | Icon key for a media `type`. |
| `getFileColor` | `(type: string) => string` | Accent color for a media `type`. |
| `isImage` | `(item: MediaItem) => boolean` | Whether the item is an image or vector. |
| `formatSize` | `(bytes: number) => string` | Human-readable file size. |
| `truncate` | `(str: string, max: number) => string` | Truncate a string with an ellipsis. |
| `mediaTypeFromMime` | `(mimeType: string, extension?: string) => MediaType` | Derive a `MediaType` from a MIME type / extension. |
| `extensionOf` | `(filename: string) => string` | Lowercase extension (without the dot). |
| `icon` | `(name: string, size?: number) => string` | Inline SVG markup for a built-in icon (default size `20`). |
| `TYPE_FILTER_OPTIONS` | `TypeFilterOption[]` | The default type-filter set. |
| `PER_PAGE_OPTIONS` | `number[]` | `[12, 24, 48, 96]`. |

```ts
import { formatSize, mediaTypeFromMime, extensionOf } from '@anil-labs/file-picker-core'

formatSize(812_000) // '793.0 KB'
extensionOf('report.PDF') // 'pdf'
mediaTypeFromMime('image/svg+xml') // 'vector'
```

## CSS

The stylesheet is required and imported separately:

```ts
import '@anil-labs/file-picker-core/styles.css'
```

Theme with the `theme` option, the `--fp-*` CSS variables, or the `.fp--dark` / `.fp--light`
classes. See [Theming](/guide/theming) for the full variable list.
