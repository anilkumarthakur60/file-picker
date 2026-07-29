import { createEffect, createSignal, onCleanup, onMount, type Accessor, type JSX } from 'solid-js'
import { isServer } from 'solid-js/web'
import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type { FilePickerOptions, MediaItem } from '@anil-labs/file-picker-core'

export interface UseFilePickerOptions extends FilePickerOptions {
  onSelect?: (items: MediaItem[]) => void
  onChange?: (items: MediaItem[]) => void
  onUpload?: (items: MediaItem[]) => void
  onError?: (err: unknown) => void
  onDelete?: (item: MediaItem) => void
  onOpen?: () => void
  onClose?: () => void
  onThemeChange?: (theme: 'light' | 'dark' | 'auto') => void
}

const toArray = (v: MediaItem[] | MediaItem | null | undefined): MediaItem[] =>
  v ? (Array.isArray(v) ? v : [v]) : []

const selectedKey = (v: MediaItem[] | MediaItem | null | undefined): string =>
  toArray(v)
    .map((i) => i.id)
    .join(',')

export interface FilePickerController {
  selected: Accessor<MediaItem[]>
  isOpen: Accessor<boolean>
  open: () => void
  close: () => void
  setSelected: (items: MediaItem[] | MediaItem | null) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
  readonly picker: FilePickerCore | null
}

/** Create and manage a FilePicker; cleans up on scope dispose. */
export function useFilePicker(options: UseFilePickerOptions): FilePickerController {
  const [selected, setSelectedSig] = createSignal<MediaItem[]>(toArray(options.selected))
  const [isOpen, setIsOpen] = createSignal(false)
  let picker: FilePickerCore | null = null

  onMount(() => {
    const p = new FilePickerCore(options)
    p.on('change', (i) => {
      setSelectedSig(i)
      options.onChange?.(i)
    })
    p.on('select', (i) => {
      setSelectedSig(i)
      options.onSelect?.(i)
    })
    p.on('upload', (i) => options.onUpload?.(i))
    p.on('delete', (i) => options.onDelete?.(i))
    p.on('error', (e) => options.onError?.(e))
    p.on('theme', (t) => options.onThemeChange?.(t))
    p.on('open', () => {
      setIsOpen(true)
      options.onOpen?.()
    })
    p.on('close', () => {
      setIsOpen(false)
      options.onClose?.()
    })
    picker = p
    onCleanup(() => p.destroy())
  })

  // Controlled selection: only push into the engine when the id set changes.
  let prevKey = selectedKey(options.selected)
  createEffect(() => {
    const key = selectedKey(options.selected)
    if (key === prevKey) return
    prevKey = key
    picker?.setSelected(options.selected ?? null)
  })

  return {
    selected,
    isOpen,
    open: () => picker?.open(),
    close: () => picker?.close(),
    setSelected: (i) => picker?.setSelected(i),
    setTheme: (t: 'light' | 'dark' | 'auto') => picker?.setTheme(t),
    get picker() {
      return picker
    },
  }
}

export interface FilePickerProps extends UseFilePickerOptions {
  label?: string
  showSelected?: boolean
}

/** A ready-made trigger + selected-thumbnails component. */
export function FilePicker(props: FilePickerProps): JSX.Element {
  // SSR-safe: never touch `document` on the server; the real wrapper (and the
  // imperative mounts below) are created only on the client.
  if (isServer || typeof document === 'undefined') return null
  const wrap = document.createElement('div')
  let core: FilePickerCore | undefined
  onMount(() => {
    core = new FilePickerCore(props)
    core.on('select', (i) => props.onSelect?.(i))
    core.on('change', (i) => props.onChange?.(i))
    core.on('upload', (i) => props.onUpload?.(i))
    core.on('delete', (i) => props.onDelete?.(i))
    core.on('error', (e) => props.onError?.(e))
    core.on('open', () => props.onOpen?.())
    core.on('close', () => props.onClose?.())
    core.on('theme', (t) => props.onThemeChange?.(t))
    const disposeTrigger = core.mountTrigger(wrap, { label: props.label })
    const disposeSelected = props.showSelected !== false ? core.mountSelected(wrap) : undefined
    onCleanup(() => {
      disposeTrigger()
      disposeSelected?.()
      core?.destroy()
      core = undefined
    })
  })
  createEffect(() => {
    if (props.theme && core) core.setTheme(props.theme)
  })
  return wrap
}

export type {
  FilePickerOptions,
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
} from '@anil-labs/file-picker-core'
