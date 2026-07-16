import { writable, type Readable } from 'svelte/store'
import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type { FilePickerOptions, MediaItem } from '@anil-labs/file-picker-core'

export interface CreateFilePickerOptions extends FilePickerOptions {
  onSelect?: (items: MediaItem[]) => void
  onChange?: (items: MediaItem[]) => void
  onUpload?: (items: MediaItem[]) => void
  onError?: (err: unknown) => void
  onDelete?: (item: MediaItem) => void
  onOpen?: () => void
  onClose?: () => void
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void
}

export interface FilePickerController {
  /** Selected items as a readable store (`$selected`). */
  selected: Readable<MediaItem[]>
  /** Whether the dialog is open (`$isOpen`). */
  isOpen: Readable<boolean>
  open: () => void
  close: () => void
  setSelected: (items: MediaItem[] | MediaItem | null) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  /** The underlying engine. */
  picker: FilePickerCore
  /** Tear down (call in `onDestroy`). */
  destroy: () => void
}

const toArray = (v: MediaItem[] | MediaItem | null | undefined): MediaItem[] =>
  v ? (Array.isArray(v) ? v : [v]) : []

/**
 * Create a FilePicker controller backed by Svelte stores. Call this inside a
 * component (e.g. `onMount`) since the engine renders to the DOM, and call
 * `.destroy()` in `onDestroy`.
 */
export function createFilePicker(options: CreateFilePickerOptions): FilePickerController {
  const picker = new FilePickerCore(options)
  const selected = writable<MediaItem[]>(toArray(options.selected))
  const isOpen = writable(false)

  picker.on('change', (i) => {
    selected.set(i)
    options.onChange?.(i)
  })
  picker.on('select', (i) => {
    selected.set(i)
    options.onSelect?.(i)
  })
  picker.on('upload', (i) => options.onUpload?.(i))
  picker.on('open', () => {
    isOpen.set(true)
    options.onOpen?.()
  })
  picker.on('close', () => {
    isOpen.set(false)
    options.onClose?.()
  })
  picker.on('error', (e) => options.onError?.(e))
  picker.on('delete', (i) => options.onDelete?.(i))
  picker.on('theme', (t) => options.onThemeChange?.(t))

  return {
    selected: { subscribe: selected.subscribe },
    isOpen: { subscribe: isOpen.subscribe },
    open: () => picker.open(),
    close: () => picker.close(),
    setSelected: (i) => picker.setSelected(i),
    setTheme: (t) => picker.setTheme(t),
    picker,
    destroy: () => picker.destroy(),
  }
}

export type {
  FilePickerOptions,
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
} from '@anil-labs/file-picker-core'
