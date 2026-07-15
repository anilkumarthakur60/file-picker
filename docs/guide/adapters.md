# Adapters

An **adapter** is the seam between the picker and your data. The engine renders the UI and manages
state; the adapter answers data questions — list this page of media, upload these files, rename this
folder. Because that's the only coupling, the picker works with any backend.

You have three options:

- [`createMemoryAdapter()`](#creatememoryadapter) — in-memory, for demos, prototypes and tests.
- [`createRestAdapter()`](#createrestadapter) — a configurable client for a JSON/REST API.
- [Implement `FilePickerAdapter`](#implement-your-own-adapter) — for GraphQL, Firebase, S3, or anything else.

## The `FilePickerAdapter` contract

An adapter is a plain object with eight methods:

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

| Method | Called when | Returns |
| --- | --- | --- |
| `listMedia(query)` | The grid loads or a filter / page / folder changes | A `MediaPage` (items + total) |
| `deleteMedia(id)` | The user deletes an item | `void` |
| `updateMedia(id, patch)` | The user saves a field in the edit dialog | The updated `MediaItem` |
| `uploadMedia(files, { folderId })` | The user uploads files | The created `MediaItem[]` |
| `listFolders()` | The picker opens / folders change | All `MediaFolder[]` |
| `createFolder(name)` | The user creates a folder | The new `MediaFolder` |
| `renameFolder(id, name)` | The user renames a folder | The updated `MediaFolder` |
| `deleteFolder(id)` | The user deletes a folder | `void` |

IDs may be **numbers or strings** (`type MediaId = string | number`). A `folderId` of `null` means
"Uncategorized". See the [type reference](/reference/api#types) for `MediaQuery`, `MediaPage`,
`MediaItem`, `MediaFolder` and `MediaEditForm`.

::: tip Pagination & filtering happen server-side
`listMedia` receives the full `MediaQuery` — `page`, `perPage`, `search`, `tag`, `type` and
`folder`. Apply those on your backend and return the matching page plus the overall `total` so the
picker can render pagination.
:::

## `createMemoryAdapter()`

An in-memory adapter — everything lives in JavaScript. Great for demos, prototypes and unit tests.
Uploads become object URLs, and deleting a folder moves its media to Uncategorized.

```ts
import { createMemoryAdapter } from '@anil-labs/file-picker-core'

const adapter = createMemoryAdapter({
  media: [
    /* MediaItem[] */
  ],
  folders: [
    /* MediaFolder[] */
  ],
  latency: 300, // simulated network delay in ms (default 200)
})
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `media` | `MediaItem[]` | `[]` | Initial media items. |
| `folders` | `MediaFolder[]` | `[]` | Initial folders. |
| `latency` | `number` | `200` | Simulated latency (ms) to mimic a network round-trip. |

The adapter filters, searches and paginates the in-memory list exactly like a real backend would, so
the whole UI is exercised without a server.

## `createRestAdapter()`

A configurable REST client. The defaults target a **Laravel-style** media API, but every shape can be
overridden with a `map*` / `parse*` / `to*` hook.

```ts
import { createRestAdapter } from '@anil-labs/file-picker-core'

const adapter = createRestAdapter({
  baseUrl: 'https://api.example.com/',
  headers: () => ({ Authorization: `Bearer ${getToken()}` }),
})
```

### Configuration

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `baseUrl` | `string` | — | Base URL. A trailing slash is optional. |
| `headers` | `HeadersInit \| () => HeadersInit \| Promise<HeadersInit>` | `{}` | Static headers, or a (possibly async) function called per request. |
| `fetch` | `typeof fetch` | global `fetch` | Custom fetch implementation. |
| `endpoints` | `Partial<RestEndpoints>` | see below | Override any endpoint path. |
| `mapMedia` | `(raw) => MediaItem` | Laravel mapping | Map a raw media object to a `MediaItem`. |
| `mapFolder` | `(raw) => MediaFolder` | Laravel mapping | Map a raw folder object to a `MediaFolder`. |
| `parseList` | `(json) => { items; total; lastPage? }` | `data` / `meta` | Extract items + pagination from a list response. |
| `toListParams` | `(query) => Record<string, string>` | see below | Map a `MediaQuery` to query-string params. |
| `toUpdateBody` | `(patch) => Record<string, unknown>` | snake_case body | Map an edit patch to your update body. |
| `uploadField` | `string` | `'file[]'` | Form field name for uploaded files. |

### Default endpoints

| Key | Default | Used for |
| --- | --- | --- |
| `media` | `medias` | List media |
| `mediaItem` | `medias/:id` | Update / delete one item |
| `upload` | `medias` | Upload |
| `folders` | `media-folders` | List / create folders |
| `folderItem` | `media-folders/:id` | Rename / delete a folder |

### Default request shape

- **List params** (`toListParams`): `page`, `rowsPerPage`, and — when present — `queryFilter`
  (search), `tagFilter`, `aggregateTypeFilter` (type) and `folderFilter` (the folder id, or `null`
  for Uncategorized).
- **List response** (`parseList`): items from `json.data` (or a top-level array), `total` and
  `last_page` from `json.meta` (or the top-level object).
- **Media fields** (`mapMedia`): `folder_id`, `mime_type`, `aggregate_type` (→ `type`), `src` (or
  `url`), `filename` (or `name`), `extension`, `size`, `alt`, `tags`.
- **Update body** (`toUpdateBody`): `filename`, `alt`, `tags` and `folder_id`, sent as `PUT`.
- **Upload**: a `multipart/form-data` `POST` with files under `uploadField` and, when set,
  `folder_id`.

### Adapting a different API

If your API differs from the defaults, override just the hooks you need:

```ts
const adapter = createRestAdapter({
  baseUrl: '/api/',
  endpoints: { media: 'assets', mediaItem: 'assets/:id' },
  toListParams: (q) => ({
    page: String(q.page),
    limit: String(q.perPage),
    ...(q.search ? { q: q.search } : {}),
    ...(q.type ? { kind: q.type } : {}),
  }),
  parseList: (json) => ({
    items: (json as any).results,
    total: (json as any).count,
  }),
  mapMedia: (raw) => ({
    id: raw.id as string,
    folderId: (raw.folder ?? null) as string | null,
    filename: String(raw.name),
    extension: String(raw.ext),
    mimeType: String(raw.content_type),
    type: String(raw.kind),
    alt: (raw.alt ?? null) as string | null,
    size: Number(raw.bytes),
    src: String(raw.download_url),
    tags: (raw.tags as string[]) ?? [],
  }),
})
```

## Implement your own adapter

For anything that isn't REST — GraphQL, Firebase, S3, an RPC client — implement the interface
directly. The picker only ever calls these eight methods, so as long as they resolve to the right
shapes, the entire UI works.

```ts
import type { FilePickerAdapter, MediaItem, MediaPage, MediaQuery } from '@anil-labs/file-picker-core'

export function createMyAdapter(client: MyApiClient): FilePickerAdapter {
  return {
    async listMedia(query: MediaQuery): Promise<MediaPage> {
      const res = await client.media.list({
        page: query.page,
        perPage: query.perPage,
        search: query.search ?? undefined,
        tag: query.tag ?? undefined,
        type: query.type ?? undefined,
        folder: query.folder ?? undefined,
      })
      return {
        items: res.rows.map(toMediaItem),
        total: res.total,
      }
    },

    async deleteMedia(id) {
      await client.media.remove(id)
    },

    async updateMedia(id, patch) {
      const updated = await client.media.update(id, patch)
      return toMediaItem(updated)
    },

    async uploadMedia(files, { folderId }) {
      const created = await client.media.upload(files, folderId)
      return created.map(toMediaItem)
    },

    async listFolders() {
      const folders = await client.folders.list()
      return folders.map((f) => ({ id: f.id, name: f.name, mediaCount: f.count }))
    },

    async createFolder(name) {
      const f = await client.folders.create(name)
      return { id: f.id, name: f.name }
    },

    async renameFolder(id, name) {
      const f = await client.folders.rename(id, name)
      return { id: f.id, name: f.name }
    },

    async deleteFolder(id) {
      await client.folders.remove(id)
    },
  }
}

function toMediaItem(row: MyApiMedia): MediaItem {
  return {
    id: row.id,
    folderId: row.folderId ?? null,
    filename: row.name,
    extension: row.ext,
    mimeType: row.mime,
    type: row.kind, // 'image' | 'video' | 'pdf' | …
    alt: row.alt ?? null,
    size: row.size,
    src: row.url,
    tags: row.tags ?? [],
  }
}
```

::: tip Errors surface as an event
If an adapter method rejects, the picker emits an [`error`](/reference/api#events) event with the
thrown value — subscribe to it to show a toast or log the failure.
:::

The utility helpers [`mediaTypeFromMime`](/reference/api#utilities), `extensionOf` and `formatSize`
can help when mapping raw rows into `MediaItem`s.
