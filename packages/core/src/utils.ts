import type { FolderScope, MediaId, MediaItem, MediaType, TypeFilterOption } from './types'

/**
 * Whether a {@link FolderScope} points at a concrete folder (a real id), as
 * opposed to the `'uncategorized'` sentinel or `null` ("all folders"). Works
 * for both string (UUID) and numeric folder ids — do NOT use `typeof === 'number'`
 * for this test, as it silently excludes string ids.
 */
export const isFolderId = (scope: FolderScope): scope is MediaId =>
  scope != null && scope !== 'uncategorized'

/** Built-in per-type icon keys. Override per instance via the `fileIcons` option. */
export const DEFAULT_FILE_ICONS: Record<string, string> = {
  image: 'image',
  vector: 'image',
  video: 'video',
  audio: 'audio',
  pdf: 'pdf',
  document: 'document',
  text: 'text',
  spreadsheet: 'spreadsheet',
  presentation: 'presentation',
}

/** Built-in per-type accent colors. Override per instance via the `fileColors` option. */
export const DEFAULT_FILE_COLORS: Record<string, string> = {
  image: '#2f6fed',
  vector: '#2f6fed',
  video: '#e5484d',
  audio: '#8e4ec6',
  pdf: '#c62828',
  document: '#1565c0',
  text: '#546e7a',
  spreadsheet: '#2e7d32',
  presentation: '#ef6c00',
}

/** Built-in icon key for a media type (falls back to a generic file icon). */
export const getFileIcon = (type: string): string => DEFAULT_FILE_ICONS[type] ?? 'file'

/** Built-in accent color for a media type. */
export const getFileColor = (type: string): string => DEFAULT_FILE_COLORS[type] ?? '#78909c'

/** Whether an item should render as an image thumbnail. */
export const isImage = (item: MediaItem): boolean => item.type === 'image' || item.type === 'vector'

/** Human-readable byte size, e.g. `1.4 MB`. */
export const formatSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

/** Truncate with an ellipsis if longer than `max`. */
export const truncate = (str: string, max: number): string =>
  str.length > max ? `${str.slice(0, max)}…` : str

/** Default options for the Type filter dropdown. */
export const TYPE_FILTER_OPTIONS: TypeFilterOption[] = [
  { label: 'Images', value: 'image', icon: 'image', color: '#2f6fed' },
  { label: 'Vectors', value: 'vector', icon: 'image', color: '#2f6fed' },
  { label: 'Videos', value: 'video', icon: 'video', color: '#e5484d' },
  { label: 'Audio', value: 'audio', icon: 'audio', color: '#8e4ec6' },
  { label: 'PDF', value: 'pdf', icon: 'pdf', color: '#c62828' },
  { label: 'Documents', value: 'document', icon: 'document', color: '#1565c0' },
  { label: 'Spreadsheets', value: 'spreadsheet', icon: 'spreadsheet', color: '#2e7d32' },
  { label: 'Presentations', value: 'presentation', icon: 'presentation', color: '#ef6c00' },
  { label: 'Text', value: 'text', icon: 'text', color: '#546e7a' },
]

/** Default "items per page" choices. */
export const PER_PAGE_OPTIONS = [12, 24, 48, 96]

/** Extract the lowercase extension (without the dot) from a filename. */
export function extensionOf(filename: string): string {
  const i = filename.lastIndexOf('.')
  return i >= 0 && i < filename.length - 1 ? filename.slice(i + 1).toLowerCase() : ''
}

/** Derive a high-level {@link MediaType} from a MIME type and/or extension. */
export function mediaTypeFromMime(mimeType: string, extension = ''): MediaType {
  const m = (mimeType || '').toLowerCase()
  const e = (extension || '').toLowerCase().replace(/^\./, '')
  if (m.startsWith('image/')) return m.includes('svg') ? 'vector' : 'image'
  if (m.startsWith('video/')) return 'video'
  if (m.startsWith('audio/')) return 'audio'
  if (m === 'application/pdf' || e === 'pdf') return 'pdf'
  if (['xls', 'xlsx', 'csv', 'ods'].includes(e) || m.includes('spreadsheet') || m.includes('excel'))
    return 'spreadsheet'
  if (['ppt', 'pptx', 'odp'].includes(e) || m.includes('presentation') || m.includes('powerpoint'))
    return 'presentation'
  if (['txt', 'md', 'log'].includes(e) || m.startsWith('text/')) return 'text'
  if (
    ['doc', 'docx', 'odt', 'rtf'].includes(e) ||
    m.includes('msword') ||
    m.includes('wordprocessing')
  )
    return 'document'
  return 'other'
}
