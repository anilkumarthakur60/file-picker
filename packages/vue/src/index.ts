import {
  defineComponent,
  h,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type PropType,
  type Ref,
  type VNode,
} from 'vue'
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

/**
 * Identity of a selection, by id and order. Controlled sync compares this
 * instead of the value so that a prop update carrying an equal-but-new array
 * (which `v-model` produces on every emit) doesn't bounce back into the picker.
 */
const selectionKey = (v: MediaItem[] | MediaItem | null | undefined): string =>
  toArray(v)
    .map((i) => i.id)
    .join(',')

/** Create and manage a FilePicker; cleans up on scope unmount. */
export function useFilePicker(options: UseFilePickerOptions): {
  picker: Ref<FilePickerCore | null>
  selected: Ref<MediaItem[]>
  isOpen: Ref<boolean>
  open: () => void
  close: () => void
  setSelected: (items: MediaItem[] | MediaItem | null) => void
  setTheme: (theme: 'light' | 'dark' | 'auto') => void
} {
  const picker = shallowRef<FilePickerCore | null>(null)
  const selected: Ref<MediaItem[]> = ref(toArray(options.selected))
  const isOpen = ref(false)

  onMounted(() => {
    const p = new FilePickerCore(options)
    p.on('change', (i) => {
      selected.value = i
      options.onChange?.(i)
    })
    p.on('select', (i) => {
      selected.value = i
      options.onSelect?.(i)
    })
    p.on('upload', (i) => options.onUpload?.(i))
    p.on('error', (e) => options.onError?.(e))
    p.on('delete', (i) => options.onDelete?.(i))
    p.on('open', () => {
      isOpen.value = true
      options.onOpen?.()
    })
    p.on('close', () => {
      isOpen.value = false
      options.onClose?.()
    })
    p.on('theme', (t) => options.onThemeChange?.(t))
    picker.value = p
  })
  onBeforeUnmount(() => picker.value?.destroy())

  // Controlled sync (mirrors the React hook). These fire only when `options`
  // is reactive (e.g. a reactive() object, or the FilePicker component's props);
  // with a plain static object they stay dormant.
  let lastSelectedKey = selectionKey(options.selected)
  watch(
    () => options.selected,
    (v) => {
      const key = selectionKey(v)
      if (key === lastSelectedKey) return
      lastSelectedKey = key
      picker.value?.setSelected(v ?? null)
    },
  )
  watch(
    () => options.theme,
    (t) => {
      if (t) picker.value?.setTheme(t)
    },
  )

  return {
    picker,
    selected,
    isOpen,
    open: () => picker.value?.open(),
    close: () => picker.value?.close(),
    setSelected: (i) => picker.value?.setSelected(i),
    setTheme: (t: 'light' | 'dark' | 'auto') => picker.value?.setTheme(t),
  }
}

/** A ready-made trigger + selected-thumbnails component. */
export const FilePicker = defineComponent({
  name: 'FilePicker',
  props: {
    options: { type: Object as PropType<UseFilePickerOptions>, required: true },
    /**
     * `v-model`  the current selection. Always **emitted** as `MediaItem[]`,
     * in single and multiple mode alike, so consumers get one stable type even
     * if `options.multiple` changes; accepts a bare item or `null` on the way
     * in. Takes precedence over `options.selected` when the prop is present.
     */
    modelValue: {
      type: [Array, Object] as PropType<MediaItem[] | MediaItem | null>,
      default: undefined,
    },
    label: { type: String, default: 'Select File' },
    showSelected: { type: Boolean, default: true },
  },
  emits: {
    'update:modelValue': (items: MediaItem[]) => Array.isArray(items),
    select: (items: MediaItem[]) => Array.isArray(items),
    change: (items: MediaItem[]) => Array.isArray(items),
    upload: (items: MediaItem[]) => Array.isArray(items),
    error: (_err: unknown) => true,
    delete: (item: MediaItem) => !!item,
    open: () => true,
    close: () => true,
    themeChange: (theme: 'light' | 'dark' | 'auto') =>
      theme === 'light' || theme === 'dark' || theme === 'auto',
  },
  setup(props, { emit, slots }) {
    const selectedEl = ref<HTMLElement>()
    // `v-model` wins over `options.selected` when supplied. `undefined` means the
    // prop was never passed; `null` is a deliberate "clear the selection".
    const controlled = (): MediaItem[] | MediaItem | null | undefined =>
      props.modelValue !== undefined ? props.modelValue : props.options.selected
    // Seeded before the picker exists so onChange can stamp it and suppress the
    // echo  see the watch() below.
    let lastSelectedKey = selectionKey(controlled())

    const { picker, open } = useFilePicker({
      ...props.options,
      selected: controlled() ?? null,
      onSelect: (i) => emit('select', i),
      onChange: (i) => {
        // Stamp first, emit second. `v-model` writes the array straight back into
        // the prop, and without this the watcher would read its own emit as an
        // external change and re-enter setSelected during the same update.
        lastSelectedKey = selectionKey(i)
        emit('change', i)
        emit('update:modelValue', i)
      },
      onUpload: (i) => emit('upload', i),
      onError: (e) => emit('error', e),
      onDelete: (i) => emit('delete', i),
      onOpen: () => emit('open'),
      onClose: () => emit('close'),
      onThemeChange: (t) => emit('themeChange', t),
    })
    onMounted(() => {
      if (props.showSelected && selectedEl.value) picker.value?.mountSelected(selectedEl.value)
    })
    watch(
      () => props.options.theme,
      (t) => {
        if (t) picker.value?.setTheme(t)
      },
    )
    // One watcher for both inbound paths: `v-model` and `options.selected`.
    watch(controlled, (v) => {
      const key = selectionKey(v)
      if (key === lastSelectedKey) return
      lastSelectedKey = key
      picker.value?.setSelected(v ?? null)
    })
    return () => {
      const children: (VNode | null)[] = [
        slots.default
          ? h(
              'span',
              { onClick: open, style: 'display:inline-flex;cursor:pointer' },
              slots.default(),
            )
          : h('button', { type: 'button', class: 'fp fp-trigger', onClick: open }, props.label),
        props.showSelected ? h('div', { ref: selectedEl }) : null,
      ]
      return h('div', {}, children)
    }
  },
})

export type {
  FilePickerOptions,
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
} from '@anil-labs/file-picker-core'
