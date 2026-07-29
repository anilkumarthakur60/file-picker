import type {
  FilePickerAdapter,
  MediaEditForm,
  MediaFolder,
  MediaId,
  MediaItem,
  MediaPage,
  MediaQuery,
} from './types'
import { extensionOf, mediaTypeFromMime } from './utils'

type Raw = Record<string, unknown>
const str = (v: unknown, fallback = ''): string => {
  if (v == null) return fallback
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  return fallback
}
const num = (v: unknown, fallback = 0): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

/* ------------------------------------------------------------------ *
 * In-memory adapter — for demos, tests and prototypes (no backend).  *
 * ------------------------------------------------------------------ */

export interface MemoryAdapterSeed {
  media?: MediaItem[]
  folders?: MediaFolder[]
  /** Simulated latency in ms, to mimic a network round-trip. @default 200 */
  latency?: number
}

const makeObjectUrl = (file: File): string =>
  typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function'
    ? URL.createObjectURL(file)
    : ''

/**
 * An in-memory {@link FilePickerAdapter}. Everything lives in JS — great for
 * demos and unit tests. Uploads become object URLs; deleting a folder moves
 * its media to Uncategorized.
 */
export function createMemoryAdapter(seed: MemoryAdapterSeed = {}): FilePickerAdapter {
  let media: MediaItem[] = (seed.media ?? []).map((m) => ({ ...m }))
  let folders: MediaFolder[] = (seed.folders ?? []).map((f) => ({ ...f }))
  const latency = seed.latency ?? 200

  const numericIds = (xs: { id: MediaId }[]): number[] =>
    xs.map((x) => Number(x.id)).filter((n) => Number.isFinite(n))
  let nextMediaId = Math.max(0, ...numericIds(media)) + 1
  let nextFolderId = Math.max(0, ...numericIds(folders)) + 1

  // Track blob: URLs minted for uploads so we can revoke them on delete.
  const objectUrls = new Map<string, string>()
  const revoke = (id: MediaId): void => {
    const key = String(id)
    const u = objectUrls.get(key)
    if (u && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(u)
    }
    objectUrls.delete(key)
  }

  const wait = <T>(value: T): Promise<T> =>
    new Promise((resolve) => setTimeout(() => resolve(value), latency))

  const sameId = (a: MediaId | null, b: MediaId | null): boolean =>
    a != null && b != null && String(a) === String(b)

  return {
    listMedia(query: MediaQuery): Promise<MediaPage> {
      let items = media.slice()
      if (query.folder === 'uncategorized') {
        items = items.filter((m) => m.folderId == null)
      } else if (query.folder != null) {
        items = items.filter((m) => sameId(m.folderId, query.folder as MediaId))
      }
      if (query.type) items = items.filter((m) => m.type === query.type)
      if (query.search) {
        const q = query.search.toLowerCase()
        items = items.filter((m) => m.filename.toLowerCase().includes(q))
      }
      if (query.tag) {
        const t = query.tag.toLowerCase()
        items = items.filter((m) => m.tags.some((tag) => tag.toLowerCase().includes(t)))
      }
      const total = items.length
      const start = (query.page - 1) * query.perPage
      const paged = items.slice(start, start + query.perPage)
      return wait({ items: paged, total, lastPage: Math.max(1, Math.ceil(total / query.perPage)) })
    },

    deleteMedia(id: MediaId): Promise<void> {
      revoke(id)
      media = media.filter((m) => !sameId(m.id, id))
      return wait(undefined)
    },

    updateMedia(id: MediaId, patch: Partial<MediaEditForm>): Promise<MediaItem> {
      const item = media.find((m) => sameId(m.id, id))
      if (!item) return Promise.reject(new Error(`Media ${String(id)} not found`))
      if (patch.filename !== undefined) item.filename = patch.filename
      if (patch.alt !== undefined) item.alt = patch.alt
      if (patch.tags !== undefined) item.tags = [...patch.tags]
      if (patch.folderId !== undefined) item.folderId = patch.folderId
      return wait({ ...item })
    },

    uploadMedia(files: File[], opts: { folderId: MediaId | null }): Promise<MediaItem[]> {
      const created = files.map((file): MediaItem => {
        const extension = extensionOf(file.name)
        const id = nextMediaId++
        const src = makeObjectUrl(file)
        if (src) objectUrls.set(String(id), src)
        return {
          id,
          folderId: opts.folderId ?? null,
          filename: file.name,
          extension,
          mimeType: file.type,
          type: mediaTypeFromMime(file.type, extension),
          alt: null,
          size: file.size,
          src,
          tags: [],
        }
      })
      media = [...created, ...media]
      return wait(created)
    },

    listFolders(): Promise<MediaFolder[]> {
      const withCounts = folders.map((f) => ({
        ...f,
        mediaCount: media.filter((m) => sameId(m.folderId, f.id)).length,
      }))
      return wait(withCounts)
    },

    createFolder(name: string): Promise<MediaFolder> {
      const folder: MediaFolder = { id: nextFolderId++, name: name.trim(), mediaCount: 0 }
      folders = [...folders, folder]
      return wait({ ...folder })
    },

    renameFolder(id: MediaId, name: string): Promise<MediaFolder> {
      const folder = folders.find((f) => sameId(f.id, id))
      if (!folder) return Promise.reject(new Error(`Folder ${String(id)} not found`))
      folder.name = name.trim()
      return wait({ ...folder })
    },

    deleteFolder(id: MediaId): Promise<void> {
      folders = folders.filter((f) => !sameId(f.id, id))
      media = media.map((m) => (sameId(m.folderId, id) ? { ...m, folderId: null } : m))
      return wait(undefined)
    },

    dispose(): void {
      // Revoke every object URL still outstanding (uploaded but not deleted).
      for (const id of [...objectUrls.keys()]) revoke(id)
    },
  }
}

/* ------------------------------------------------------------------ *
 * REST adapter — a configurable client for a JSON/REST backend.      *
 * Defaults match a Laravel-style media API.                          *
 * ------------------------------------------------------------------ */

export interface RestEndpoints {
  /** List media. @default 'medias' */
  media: string
  /** Single media item, `:id` is substituted. @default 'medias/:id' */
  mediaItem: string
  /** Upload target. @default 'medias' */
  upload: string
  /** List/create folders. @default 'media-folders' */
  folders: string
  /** Single folder, `:id` is substituted. @default 'media-folders/:id' */
  folderItem: string
}

export interface RestAdapterConfig {
  /** Base URL, e.g. `https://api.example.com/`. A trailing slash is optional. */
  baseUrl: string
  /** Static headers, or a (possibly async) function returning them per request. */
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>)
  /** Custom fetch (defaults to global `fetch`). */
  fetch?: typeof fetch
  /** Override any endpoint path. */
  endpoints?: Partial<RestEndpoints>
  /** Map a raw media object from your API to a {@link MediaItem}. */
  mapMedia?: (raw: Raw) => MediaItem
  /** Map a raw folder object to a {@link MediaFolder}. */
  mapFolder?: (raw: Raw) => MediaFolder
  /** Extract items + pagination from a list response. */
  parseList?: (json: unknown) => { items: Raw[]; total: number; lastPage?: number }
  /** Map a {@link MediaQuery} to your list endpoint's query-string params. */
  toListParams?: (query: MediaQuery) => Record<string, string>
  /** Map an edit patch to your update endpoint's body. */
  toUpdateBody?: (patch: Partial<MediaEditForm>) => Record<string, unknown>
  /** Field name for uploaded files. @default 'file[]' */
  uploadField?: string
}

const DEFAULT_ENDPOINTS: RestEndpoints = {
  media: 'medias',
  mediaItem: 'medias/:id',
  upload: 'medias',
  folders: 'media-folders',
  folderItem: 'media-folders/:id',
}

let warnedMissingId = false
const defaultMapMedia = (raw: Raw): MediaItem => {
  const id = (raw.id ?? raw.uuid ?? '') as MediaId
  if (id === '' && !warnedMissingId && typeof console !== 'undefined') {
    warnedMissingId = true
    console.warn(
      '[file-picker] a media item has no `id`/`uuid`; selection and dedup may ' +
        'misbehave when several rows share the empty id. Provide a `mapMedia` ' +
        'that returns a stable id.',
    )
  }
  return {
    id,
    folderId: (raw.folder_id ?? raw.folderId ?? null) as MediaId | null,
    filename: str(raw.filename ?? raw.name),
    extension: str(raw.extension),
    mimeType: str(raw.mime_type ?? raw.mimeType),
    type: str(raw.aggregate_type ?? raw.type ?? 'other'),
    alt: (raw.alt ?? null) as string | null,
    size: num(raw.size),
    src: str(raw.src ?? raw.url),
    tags: Array.isArray(raw.tags) ? (raw.tags as string[]) : [],
  }
}

const defaultMapFolder = (raw: Raw): MediaFolder => ({
  id: (raw.id ?? '') as MediaId,
  name: str(raw.name),
  mediaCount: raw.media_count != null ? num(raw.media_count) : undefined,
})

const defaultParseList = (json: unknown): { items: Raw[]; total: number; lastPage?: number } => {
  const j = (json ?? {}) as Raw
  const items = (Array.isArray(j.data) ? j.data : Array.isArray(json) ? json : []) as Raw[]
  const meta = (j.meta ?? j) as Raw
  const total = num(meta.total, items.length)
  const lastPage = meta.last_page != null ? num(meta.last_page) : undefined
  return { items, total, lastPage }
}

const defaultToListParams = (q: MediaQuery): Record<string, string> => ({
  page: String(q.page),
  rowsPerPage: String(q.perPage),
  ...(q.search ? { queryFilter: q.search } : {}),
  ...(q.tag ? { tagFilter: q.tag } : {}),
  ...(q.type ? { aggregateTypeFilter: q.type } : {}),
  ...(q.folder === 'uncategorized'
    ? { folderFilter: 'null' }
    : q.folder != null
      ? { folderFilter: String(q.folder) }
      : {}),
})

const defaultToUpdateBody = (patch: Partial<MediaEditForm>): Record<string, unknown> => {
  const body: Record<string, unknown> = {}
  if (patch.filename !== undefined) body.filename = patch.filename
  if (patch.alt !== undefined) body.alt = patch.alt
  if (patch.tags !== undefined) body.tags = patch.tags
  if (patch.folderId !== undefined) body.folder_id = patch.folderId
  return body
}

const unwrap = (json: unknown): Raw => {
  const j = (json ?? {}) as Raw
  return (j.data ?? j) as Raw
}

/**
 * A configurable REST {@link FilePickerAdapter}. Point it at your API and, if
 * your shapes differ from the defaults, override the `map*` / `parse*` hooks.
 */
export function createRestAdapter(config: RestAdapterConfig): FilePickerAdapter {
  const base = config.baseUrl.endsWith('/') ? config.baseUrl : `${config.baseUrl}/`
  const doFetch = config.fetch ?? globalThis.fetch
  const endpoints = { ...DEFAULT_ENDPOINTS, ...config.endpoints }
  const mapMedia = config.mapMedia ?? defaultMapMedia
  const mapFolder = config.mapFolder ?? defaultMapFolder
  const parseList = config.parseList ?? defaultParseList
  const toListParams = config.toListParams ?? defaultToListParams
  const toUpdateBody = config.toUpdateBody ?? defaultToUpdateBody
  const uploadField = config.uploadField ?? 'file[]'

  const resolveHeaders = async (): Promise<HeadersInit> =>
    typeof config.headers === 'function' ? await config.headers() : (config.headers ?? {})

  const url = (path: string): string => `${base}${path.replace(/^\//, '')}`
  const withId = (path: string, id: MediaId): string => url(path.replace(':id', String(id)))

  async function request(path: string, init: RequestInit = {}): Promise<unknown> {
    const headers = new Headers(await resolveHeaders())
    if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }
    if (!headers.has('Accept')) headers.set('Accept', 'application/json')
    const res = await doFetch(path, { ...init, headers })
    if (!res.ok) throw new Error(`${init.method ?? 'GET'} ${path} failed: ${res.status}`)
    if (res.status === 204) return undefined
    const text = await res.text()
    return text ? (JSON.parse(text) as unknown) : undefined
  }

  return {
    async listMedia(query: MediaQuery): Promise<MediaPage> {
      const qs = new URLSearchParams(toListParams(query)).toString()
      const json = await request(`${url(endpoints.media)}?${qs}`)
      const { items, total, lastPage } = parseList(json)
      return { items: items.map(mapMedia), total, lastPage }
    },

    async deleteMedia(id: MediaId): Promise<void> {
      await request(withId(endpoints.mediaItem, id), { method: 'DELETE' })
    },

    async updateMedia(id: MediaId, patch: Partial<MediaEditForm>): Promise<MediaItem> {
      const json = await request(withId(endpoints.mediaItem, id), {
        method: 'PUT',
        body: JSON.stringify(toUpdateBody(patch)),
      })
      return mapMedia(unwrap(json))
    },

    async uploadMedia(files: File[], opts: { folderId: MediaId | null }): Promise<MediaItem[]> {
      const form = new FormData()
      for (const file of files) form.append(uploadField, file)
      if (opts.folderId != null) form.append('folder_id', String(opts.folderId))
      const json = await request(url(endpoints.upload), { method: 'POST', body: form })
      const j = (json ?? {}) as Raw
      const data = (Array.isArray(j.data) ? j.data : Array.isArray(json) ? json : [j]) as Raw[]
      return data.map(mapMedia)
    },

    async listFolders(): Promise<MediaFolder[]> {
      const json = await request(`${url(endpoints.folders)}?rowsPerPage=0`)
      const j = (json ?? {}) as Raw
      const data = (Array.isArray(j.data) ? j.data : Array.isArray(json) ? json : []) as Raw[]
      return data.map(mapFolder)
    },

    async createFolder(name: string): Promise<MediaFolder> {
      const json = await request(url(endpoints.folders), {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      return mapFolder(unwrap(json))
    },

    async renameFolder(id: MediaId, name: string): Promise<MediaFolder> {
      const json = await request(withId(endpoints.folderItem, id), {
        method: 'PUT',
        body: JSON.stringify({ name }),
      })
      return mapFolder(unwrap(json))
    },

    async deleteFolder(id: MediaId): Promise<void> {
      await request(withId(endpoints.folderItem, id), { method: 'DELETE' })
    },
  }
}
