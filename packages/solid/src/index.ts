import { createEffect, createSignal, onCleanup, onMount, type Accessor, type JSX } from 'solid-js'
import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type { FilePickerOptions, MediaItem } from '@anil-labs/file-picker-core'

export interface UseFilePickerOptions extends FilePickerOptions {
  onSelect?: (items: MediaItem[]) => void
  onChange?: (items: MediaItem[]) => void
  onUpload?: (items: MediaItem[]) => void
}

const toArray = (v: MediaItem[] | MediaItem | null | undefined): MediaItem[] =>
  v ? (Array.isArray(v) ? v : [v]) : []

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
    p.on('open', () => setIsOpen(true))
    p.on('close', () => setIsOpen(false))
    picker = p
    onCleanup(() => p.destroy())
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
  const wrap = document.createElement('div')
  let core: FilePickerCore | undefined
  onMount(() => {
    core = new FilePickerCore(props)
    core.on('select', (i) => props.onSelect?.(i))
    core.on('change', (i) => props.onChange?.(i))
    core.on('upload', (i) => props.onUpload?.(i))
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
