# Features

A tour of what the picker does out of the box. Everything here is driven by the core engine and
works identically across every binding — the only per-feature configuration is a handful of
[options](/reference/api#options).

## Folders

The left rail lists your folders (from `listFolders()`), plus a built-in **Uncategorized** scope for
media with a `folderId` of `null`. Users can browse into a folder to filter the grid, and — when
`manageFolders` is enabled (the default) — create, rename and delete folders inline.

Deleting a folder moves its media to Uncategorized rather than deleting the files.

```ts
new FilePicker({ adapter, manageFolders: true }) // default; set false to hide folder controls
```

## Upload

Users can upload by clicking the drop zone or by dragging files onto it, then choose a destination
folder. Uploaded files are handed to your adapter's `uploadMedia(files, { folderId })`, and the
returned items appear in the grid. An [`upload`](/reference/api#events) event fires with the created
items.

- Toggle the whole upload UI with `allowUpload` (default `true`).
- Restrict accepted files with the `accept` option (passed straight to the file input's `accept`
  attribute), e.g. `accept: 'image/*'`.

```ts
new FilePicker({ adapter, allowUpload: true, accept: 'image/*,application/pdf' })
```

## Editing

The edit dialog lets users change an item's **filename, alt text, tags and folder**. Each field is
saved independently through `updateMedia(id, patch)`, where `patch` is a `Partial<MediaEditForm>`.
Set `allowEdit: false` to hide it.

Per-item deletion is controlled by `allowDelete` (default `true`) and calls `deleteMedia(id)`,
emitting a [`delete`](/reference/api#events) event.

```ts
new FilePicker({ adapter, allowEdit: true, allowDelete: true })
```

## Selection

Selection is single by default. Set `multiple: true` to allow more than one item:

```ts
new FilePicker({ adapter, multiple: true })
```

- **Shift-click range** — in multiple mode, click one item then shift-click another to select the
  whole range between them.
- **Selected strip** — a live thumbnails strip of the current selection can be mounted next to your
  trigger with `mountSelected(el)` (the framework `<FilePicker>` components render it for you; toggle
  with `showSelected`).
- **Events** — [`change`](/reference/api#events) fires on every add / remove / clear;
  [`select`](/reference/api#events) fires when the user confirms with **Done**.
- **Preset & read** — pass `selected` to start with a selection, or call `setSelected(items)` /
  `getSelected()` at runtime.

```ts
const picker = new FilePicker({ adapter, multiple: true, selected: [existingItem] })
picker.on('change', (items) => console.log('selection is now', items))
picker.on('select', (items) => console.log('confirmed', items))
```

## Filters, search & tags

The toolbar offers three independent filters, all passed to `listMedia(query)`:

- **Search** — matches against the filename (`query.search`).
- **Tag** — filters by tag (`query.tag`).
- **Type** — a dropdown of high-level buckets (`query.type`): images, videos, audio, PDF, documents,
  spreadsheets and presentations. Customize the options with `typeFilters`; the default set is
  exported as [`TYPE_FILTER_OPTIONS`](/reference/api#utilities).

Because these arrive in the adapter query, filtering runs wherever your data lives — server-side for
REST, in-memory for the memory adapter.

```ts
new FilePicker({
  adapter,
  typeFilters: [
    { label: 'Images', value: 'image', icon: 'image', color: '#2f6fed' },
    { label: 'Videos', value: 'video', icon: 'video', color: '#e5484d' },
  ],
})
```

## Pagination

The grid is paginated. Control the page size and the choices offered in the "per page" selector:

```ts
new FilePicker({
  adapter,
  perPage: 24, // default
  perPageOptions: [12, 24, 48, 96], // default
})
```

Your adapter returns a `MediaPage` with the page's `items` and the overall `total`; the picker
derives the page count (or you can return an explicit `lastPage`).

## Preview

Clicking the preview action on an item opens an **image lightbox** for images and vectors. Other file
types (PDF, video, audio, documents…) open in a new browser tab using the item's `src`. The correct
icon and accent color for each non-image type come from the built-in
[`getFileIcon`](/reference/api#utilities) / `getFileColor` helpers.

## Putting it together

```ts
import { FilePicker } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'

const picker = new FilePicker({
  adapter,
  multiple: true,
  title: 'Media Library',
  perPage: 48,
  accept: 'image/*',
})

picker.on('select', (items) => save(items))
picker.on('upload', (items) => console.log('uploaded', items))
picker.on('delete', (item) => console.log('deleted', item.filename))
picker.on('error', (err) => console.error(err))

picker.open()
```

See the [API reference](/reference/api) for the full list of options, methods and events.
