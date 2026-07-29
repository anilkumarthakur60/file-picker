/**
 * Public types for @anil-labs/file-picker-core.
 *
 * The picker is backend-agnostic: your {@link FilePickerAdapter} maps your API's
 * shape into these plain structures. IDs may be numbers or strings.
 */

export type MediaId = string | number

/** High-level file bucket — drives the icon, preview and type-filter. */
export type MediaType =
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

/** A single media item in the library. */
export interface MediaItem {
  id: MediaId
  /** Owning folder id, or `null` for "Uncategorized". */
  folderId: MediaId | null
  filename: string
  extension: string
  mimeType: string
  /** High-level bucket (`image`, `video`, …). Accepts custom strings too. */
  type: MediaType | (string & {})
  alt: string | null
  size: number
  /** URL to the file — used for image thumbnails and the preview lightbox. */
  src: string
  tags: string[]
}

/** A folder that groups media. */
export interface MediaFolder {
  id: MediaId
  name: string
  /** Optional count shown next to the folder in the selector. */
  mediaCount?: number
}

/** Folder scope: an id, the special `'uncategorized'`, or `null` for all. */
// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents -- 'uncategorized' is a documented sentinel (subsumed by string ids, kept for editor hints)
export type FolderScope = MediaId | 'uncategorized' | null

/** The query your adapter receives when listing media. */
export interface MediaQuery {
  /** 1-based page number. */
  page: number
  perPage: number
  search?: string | null
  tag?: string | null
  /** Aggregate-type filter (`image`, `video`, …) or null for all types. */
  type?: string | null
  /** Folder scope: an id, `'uncategorized'`, or null for all folders. */
  folder?: FolderScope
}

/** A page of media returned by the adapter. */
export interface MediaPage {
  items: MediaItem[]
  /** Total items across all pages (drives pagination). */
  total: number
  /** 1-based last page. If omitted, it is derived from `total` / `perPage`. */
  lastPage?: number
}

/** The editable metadata fields for a media item. */
export interface MediaEditForm {
  filename: string
  alt: string | null
  tags: string[]
  folderId: MediaId | null
}

/** An option in the Type filter dropdown. */
export interface TypeFilterOption {
  label: string
  value: string
  /** Icon key from the built-in icon set. */
  icon: string
  /** CSS color for the icon. */
  color: string
}

/**
 * The data source. Implement this against your backend, or use one of the
 * built-in factories: `createRestAdapter()` (a configurable REST client) or
 * `createMemoryAdapter()` (in-memory, for demos and tests).
 */
export interface FilePickerAdapter {
  /** List media for a query (search/tag/type/folder + pagination). */
  listMedia(query: MediaQuery): Promise<MediaPage>
  /** Permanently delete a media item. */
  deleteMedia(id: MediaId): Promise<void>
  /** Patch a media item's metadata; returns the updated item. */
  updateMedia(id: MediaId, patch: Partial<MediaEditForm>): Promise<MediaItem>
  /** Upload files into a folder (null → Uncategorized); returns created items. */
  uploadMedia(files: File[], opts: { folderId: MediaId | null }): Promise<MediaItem[]>
  /** List all folders. */
  listFolders(): Promise<MediaFolder[]>
  /** Create a folder by name. */
  createFolder(name: string): Promise<MediaFolder>
  /** Rename a folder. */
  renameFolder(id: MediaId, name: string): Promise<MediaFolder>
  /** Delete a folder (its files move to Uncategorized). */
  deleteFolder(id: MediaId): Promise<void>
  /**
   * Optional teardown, called from {@link FilePicker.destroy}. Release any
   * resources the adapter holds — e.g. revoke object URLs, abort in-flight
   * requests. Safe to omit for stateless adapters.
   */
  dispose?(): void
}

/**
 * Every user-facing string the picker renders. Pass a `Partial<FilePickerLabels>`
 * as the `labels` option to translate or reword any of them; function-valued
 * entries receive their interpolation values. See `defaultLabels` for the
 * built-in English set.
 */
export interface FilePickerLabels {
  title: string
  filters: string
  toggleTheme: string
  upload: string
  done: string
  selectAction: (n: number) => string
  clearSelection: string
  selected: (n: number) => string
  searchPlaceholder: string
  tagPlaceholder: string
  allTypes: string
  clearFilters: string
  refresh: string
  closeFilters: string
  loading: string
  results: (n: number) => string
  errorTitle: string
  errorBody: string
  retry: string
  emptyTitle: string
  emptyBody: string
  emptyReadonlyBody: string
  emptyUpload: string
  filteredTitle: string
  filteredBody: string
  first: string
  previous: string
  next: string
  last: string
  itemsPerPage: string
  perPageOption: (n: number) => string
  pageStatus: (page: number, last: number, total: number) => string
  preview: string
  open: string
  edit: string
  delete: string
  remove: string
  close: string
  cancel: string
  ok: string
  confirm: string
  uploadTitle: string
  destinationFolder: string
  uploadToFolder: string
  dropHint: string
  uploaded: (n: number) => string
  uploadFailed: string
  uploadSkipped: (n: number) => string
  editTitle: string
  filename: string
  altText: string
  altPlaceholder: string
  saveAlt: string
  saveFilename: string
  folder: string
  tags: string
  addTagHint: string
  saveTags: string
  saved: string
  saveFailed: string
  editMeta: (type: string, mime: string, size: string) => string
  deleteFileTitle: string
  deleteFileConfirm: (name: string) => string
  fileDeleted: string
  deleteFailed: string
  createFolderFailed: string
  deleteFolderFailed: string
  closePreview: string
  maxSelection: (n: number) => string
  allFolders: string
  uncategorized: string
  folderLabel: string
  folderSearch: string
  createFolder: (name: string) => string
  noFolders: string
  deleteFolderControl: string
  deleteFolderTitle: string
  deleteFolderConfirm: (name: string) => string
  renameFolderControl: string
  renameFolderTitle: string
  renameFolderMessage: string
  renameFolderFailed: string
}

/** Options for constructing a {@link FilePicker}. */
export interface FilePickerOptions {
  /** Data source — implement {@link FilePickerAdapter} or use a built-in factory. */
  adapter: FilePickerAdapter
  /** Allow selecting more than one item. @default false */
  multiple?: boolean
  /** Initially-selected item(s). */
  selected?: MediaItem[] | MediaItem | null
  /** Items per page. @default 24 */
  perPage?: number
  /** Options offered in the "per page" selector. @default [12, 24, 48, 96] */
  perPageOptions?: number[]
  /** Type-filter options. Defaults to the built-in set. */
  typeFilters?: TypeFilterOption[]
  /** Color theme. @default 'auto' */
  theme?: 'light' | 'dark' | 'auto'
  /** Show the light/dark toggle button in the dialog header. @default true */
  themeToggle?: boolean
  /** Extra class on the picker root for custom styling. */
  className?: string
  /** Dialog title. @default 'Media Library' */
  title?: string
  /** `accept` attribute for the upload input. */
  accept?: string
  /** Show folder create/rename/delete controls. @default true */
  manageFolders?: boolean
  /** Show the upload UI. @default true */
  allowUpload?: boolean
  /** Show the edit dialog. @default true */
  allowEdit?: boolean
  /** Show per-item delete. @default true */
  allowDelete?: boolean
  /** Debounce (ms) for the search & tag inputs. @default 400 */
  searchDebounce?: number
  /** In single-select, confirm and close as soon as an item is picked. @default `!multiple` */
  closeOnSelect?: boolean
  /** Maximum items selectable in multiple mode. No limit by default. */
  maxSelection?: number
  /** Override the per-type icon key, merged over the built-ins (e.g. `{ video: 'film' }`). */
  fileIcons?: Record<string, string>
  /** Override the per-type accent color, merged over the built-ins. */
  fileColors?: Record<string, string>
  /** Override any user-facing string (for i18n / white-labeling). */
  labels?: Partial<FilePickerLabels>
  /** Dialog layout: full-screen (default) or a centered modal card on desktop. @default 'fullscreen' */
  layout?: 'fullscreen' | 'modal'
  /** Replace the empty-library markup (returns trusted HTML). */
  renderEmpty?: () => string
  /** Replace the first-load skeleton/loading markup (returns trusted HTML). */
  renderLoading?: () => string
  /** Replace a card's meta line — e.g. show dimensions or a date (returns trusted HTML). */
  renderCardMeta?: (item: MediaItem) => string
  /** Extra buttons to mount in the header toolbar. */
  headerActions?: HTMLElement[]
}
