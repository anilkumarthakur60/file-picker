# Features

A tour of what the picker does out of the box. Everything here is driven by the core engine and
works identically across every binding — the only per-feature configuration is a handful of
[options](/reference/api#options).

## Folders

The left rail lists your folders (from `listFolders()`), plus a built-in **Uncategorized** scope for
media with a `folderId` of `null`. Users can browse into a folder to filter the grid, and — when
`manageFolders` is enabled (the default) — create, rename and delete folders inline.

Deleting a folder moves its media to Uncategorized rather than deleting the files.

**Renaming** is inline too: a folder's rename control opens a small prompt for the new name, which is
sent to your adapter's `renameFolder(id, name)` and applied across the rail and any open dialogs. If
the adapter rejects it, the old name stays put and the failure surfaces as a toast plus an
[`error`](/reference/api#events) event.

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

- **Click anywhere on a card** — the whole card toggles selection, as does its checkbox, which is
  always visible and is the only thing that shows the state: a selected card takes no border or tint
  of its own. Keyboard users toggle the focused card with <kbd>Enter</kbd> or <kbd>Space</kbd>, and
  only they see a focus ring on the card.
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
- **Type** — a dropdown of high-level buckets (`query.type`): images, vectors, videos, audio, PDF,
  documents, spreadsheets, presentations and text. Customize the options with `typeFilters`; the
  default set is exported as [`TYPE_FILTER_OPTIONS`](/reference/api#utilities).

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
  perPage: 20, // default
  perPageOptions: [10, 20, 50, 100, 200], // default
})
```

Your adapter returns a `MediaPage` with the page's `items` and the overall `total`; the picker
derives the page count (or you can return an explicit `lastPage`).

## Preview

Clicking an item's **preview** action shows it without leaving the dialog:

- **Images & vectors** open in an in-dialog **lightbox**.
- **Video & audio** play inline in the preview overlay with native controls, autoplaying on open.
  Closing the overlay detaches the media element, so playback stops immediately.

File types that can't render inline (PDF, documents, spreadsheets…) get an **open** action instead,
which opens the item's `src` in a new browser tab. The correct icon and accent color for each
non-image type come from the built-in [`getFileIcon`](/reference/api#utilities) / `getFileColor`
helpers.

## Empty & filtered states

The grid distinguishes two "nothing to show" cases, so users always know why:

- **Empty library** — there's genuinely no media yet. It invites the first upload with an **Upload
  files** CTA. With `allowUpload: false` the CTA is dropped and the copy switches to a read-only
  message.
- **No matches** — a search, tag or type filter has hidden everything. It offers a **Clear filters**
  CTA that resets the toolbar in one click.

Every string is translatable (`emptyTitle` / `emptyBody` / `emptyUpload` and `filteredTitle` /
`filteredBody` — see [i18n](/guide/i18n)), and you can replace the empty-library markup wholesale
with `renderEmpty` (the filtered state keeps its built-in clear-filters CTA):

```ts
new FilePicker({ adapter, renderEmpty: () => `<div class="my-empty">Nothing here yet</div>` })
```

## Feedback & announcements

Actions that succeed or fail — uploads, edits, deletes, folder operations — surface a transient
**toast** in the corner of the dialog. Toasts double as accessibility feedback: they live in an
`aria-live="polite"` region, so screen readers announce them as well as sighted users seeing them. A
separate visually-hidden live region announces grid status as it changes — loading, the result count,
and load errors — so assistive tech follows along without any visual cue. All of the wording is
translatable through [`labels`](/guide/i18n).

## Keyboard navigation

The media grid is fully keyboard operable. Cards share a **roving tabindex**, so **Tab** enters the
grid once and the arrow keys take over from there:

- **Arrow keys** move between cards — left/right within a row, up/down across rows, using the real
  laid-out column count.
- **Home** / **End** jump to the first / last item.
- **Enter** / **Space** toggle selection on the focused card.
- **Shift + arrow** extends the selection as you move, in `multiple` mode.

## Layout

By default the dialog fills the screen. Set `layout: 'modal'` to render it as a centered card floating
over a dimmed backdrop on desktop instead:

```ts
new FilePicker({ adapter, layout: 'modal' }) // 'fullscreen' (default) | 'modal'
```

On small screens the modal layout expands to fill the viewport so the grid keeps the room it needs.

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
