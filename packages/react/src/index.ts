'use client'
import { createElement as h, useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type { FilePickerOptions, MediaItem } from '@anil-labs/file-picker-core'

export interface UseFilePickerOptions extends FilePickerOptions {
  onSelect?: (items: MediaItem[]) => void
  onChange?: (items: MediaItem[]) => void
  onUpload?: (items: MediaItem[]) => void
}

export interface FilePickerController {
  /** The underlying engine (null until mounted on the client). */
  picker: FilePickerCore | null
  /** Currently-selected items (reactive). */
  selected: MediaItem[]
  isOpen: boolean
  open: () => void
  close: () => void
  setSelected: (items: MediaItem[] | MediaItem | null) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
}

const toArray = (v: MediaItem[] | MediaItem | null | undefined): MediaItem[] =>
  v ? (Array.isArray(v) ? v : [v]) : []

/**
 * Create and manage a FilePicker instance. The picker is created on mount
 * (client-only) and destroyed on unmount; selection is mirrored into state.
 */
export function useFilePicker(options: UseFilePickerOptions): FilePickerController {
  const optionsRef = useRef(options)
  optionsRef.current = options
  const [picker, setPicker] = useState<FilePickerCore | null>(null)
  const [selected, setSelectedState] = useState<MediaItem[]>(() => toArray(options.selected))
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const p = new FilePickerCore(optionsRef.current)
    const offs = [
      p.on('change', (items) => {
        setSelectedState(items)
        optionsRef.current.onChange?.(items)
      }),
      p.on('select', (items) => {
        setSelectedState(items)
        optionsRef.current.onSelect?.(items)
      }),
      p.on('upload', (items) => optionsRef.current.onUpload?.(items)),
      p.on('open', () => setIsOpen(true)),
      p.on('close', () => setIsOpen(false)),
    ]
    setPicker(p)
    return () => {
      for (const off of offs) off()
      p.destroy()
    }
    // Created once — the adapter is read at construction and callbacks use a ref.
  }, [])

  const theme = options.theme
  useEffect(() => {
    if (picker && theme) picker.setTheme(theme)
  }, [picker, theme])

  const open = useCallback(() => picker?.open(), [picker])
  const close = useCallback(() => picker?.close(), [picker])
  const setSelected = useCallback(
    (items: MediaItem[] | MediaItem | null) => picker?.setSelected(items),
    [picker],
  )
  const setTheme = useCallback((t: 'light' | 'dark' | 'auto') => picker?.setTheme(t), [picker])

  return { picker, selected, isOpen, open, close, setSelected, setTheme }
}

export interface FilePickerProps extends UseFilePickerOptions {
  /** Trigger label (ignored when `children` is provided). */
  label?: string
  /** Custom trigger content — clicking it opens the picker. */
  children?: ReactNode
  /** Render the selected-thumbnails strip below the trigger. @default true */
  showSelected?: boolean
  /** Class name for the wrapper element. */
  wrapperClass?: string
}

/**
 * A ready-made trigger + selected-thumbnails wrapper. For full control, use
 * {@link useFilePicker} and render your own trigger.
 */
export function FilePicker(props: FilePickerProps): ReactNode {
  const { label, children, showSelected = true, wrapperClass, ...options } = props
  const { picker, open } = useFilePicker(options)
  const selectedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!picker || !showSelected || !selectedRef.current) return
    return picker.mountSelected(selectedRef.current)
  }, [picker, showSelected])

  const trigger = children
    ? h('span', { onClick: open, style: { display: 'inline-flex', cursor: 'pointer' } }, children)
    : h(
        'button',
        { type: 'button', className: 'fp fp-trigger', onClick: open },
        label ?? 'Select File',
      )

  return h(
    'div',
    { className: wrapperClass },
    trigger,
    showSelected ? h('div', { ref: selectedRef }) : null,
  )
}

export type {
  FilePickerOptions,
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
} from '@anil-labs/file-picker-core'
