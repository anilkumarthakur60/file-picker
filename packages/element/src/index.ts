import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type {
  FilePickerAdapter,
  FilePickerLabels,
  FilePickerOptions,
  MediaItem,
  TypeFilterOption,
} from '@anil-labs/file-picker-core'

/**
 * SSR-safe base: `HTMLElement` is undefined outside the browser, so evaluating
 * `class ... extends HTMLElement` at import time would throw during SSR. Fall
 * back to an inert base; `register()` still guards actual definition.
 */
const Base: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement)

/**
 * `<file-picker>` custom element. Set the required `adapter` as a JS property
 * (it's an object), configure the rest via attributes, and listen for
 * `fp:select` / `fp:change` / `fp:upload` events (`event.detail` is the items).
 *
 * ```html
 * <file-picker multiple label="Choose media"></file-picker>
 * <script type="module">
 *   import { createMemoryAdapter } from '@anil-labs/file-picker-core'
 *   const el = document.querySelector('file-picker')
 *   el.adapter = createMemoryAdapter({ media: [] })
 *   el.addEventListener('fp:select', (e) => console.log(e.detail))
 * </script>
 * ```
 */
export class FilePickerElement extends Base {
  private core: FilePickerCore | null = null
  private adapterRef: FilePickerAdapter | null = null
  private selectedRef: MediaItem[] = []
  private selectedKey = ''
  private typeFiltersRef: TypeFilterOption[] | null = null
  private fileIconsRef: Record<string, string> | null = null
  private fileColorsRef: Record<string, string> | null = null
  private labelsRef: Partial<FilePickerLabels> | null = null
  private perPageOptionsRef: number[] | null = null
  private renderEmptyRef: (() => string) | null = null
  private renderLoadingRef: (() => string) | null = null
  private renderCardMetaRef: ((item: MediaItem) => string) | null = null
  private headerActionsRef: HTMLElement[] | null = null
  private disposers: (() => void)[] = []

  static readonly observedAttributes = [
    'multiple',
    'label',
    'theme',
    'title',
    'per-page',
    'show-selected',
    'allow-upload',
    'allow-edit',
    'allow-delete',
    'manage-folders',
    'accept',
    'class-name',
    'layout',
    'close-on-select',
    'max-selection',
    'search-debounce',
  ]

  /** The data source (required). Set as a property, not an attribute. */
  set adapter(adapter: FilePickerAdapter | null) {
    this.adapterRef = adapter
    this.build()
  }
  get adapter(): FilePickerAdapter | null {
    return this.adapterRef
  }

  /** The underlying engine, once built. */
  get picker(): FilePickerCore | null {
    return this.core
  }

  /** Currently-selected items. Set as a property (array/item/null). */
  set selected(v: MediaItem[] | MediaItem | null) {
    const items = Array.isArray(v) ? v : v ? [v] : []
    this.selectedRef = items
    // Keyed on the ids so reference-only changes don't loop back through 'change'.
    const key = items.map((i) => i.id).join(',')
    if (key === this.selectedKey) return
    this.selectedKey = key
    this.core?.setSelected(items)
  }
  get selected(): MediaItem[] {
    return this.core?.getSelected() ?? this.selectedRef
  }

  /** Type-filter options (object config; set as a property, not an attribute). */
  set typeFilters(v: TypeFilterOption[] | null) {
    this.typeFiltersRef = v
    this.build()
  }
  get typeFilters(): TypeFilterOption[] | null {
    return this.typeFiltersRef
  }

  /** Per-type icon overrides (set as a property, not an attribute). */
  set fileIcons(v: Record<string, string> | null) {
    this.fileIconsRef = v
    this.build()
  }
  get fileIcons(): Record<string, string> | null {
    return this.fileIconsRef
  }

  /** Per-type color overrides (set as a property, not an attribute). */
  set fileColors(v: Record<string, string> | null) {
    this.fileColorsRef = v
    this.build()
  }
  get fileColors(): Record<string, string> | null {
    return this.fileColorsRef
  }

  /** Label overrides for i18n / white-labeling (set as a property, not an attribute). */
  set labels(v: Partial<FilePickerLabels> | null) {
    this.labelsRef = v
    this.build()
  }
  get labels(): Partial<FilePickerLabels> | null {
    return this.labelsRef
  }

  /** Per-page choices (object config; set as a property, not an attribute). */
  set perPageOptions(v: number[] | null) {
    this.perPageOptionsRef = v
    this.build()
  }
  get perPageOptions(): number[] | null {
    return this.perPageOptionsRef
  }

  /** Custom empty-state HTML factory (set as a property, not an attribute). */
  set renderEmpty(v: (() => string) | null) {
    this.renderEmptyRef = v
    this.build()
  }
  get renderEmpty(): (() => string) | null {
    return this.renderEmptyRef
  }

  /** Custom loading HTML factory (set as a property, not an attribute). */
  set renderLoading(v: (() => string) | null) {
    this.renderLoadingRef = v
    this.build()
  }
  get renderLoading(): (() => string) | null {
    return this.renderLoadingRef
  }

  /** Custom per-card meta HTML factory (set as a property, not an attribute). */
  set renderCardMeta(v: ((item: MediaItem) => string) | null) {
    this.renderCardMetaRef = v
    this.build()
  }
  get renderCardMeta(): ((item: MediaItem) => string) | null {
    return this.renderCardMetaRef
  }

  /** Extra header action elements (set as a property, not an attribute). */
  set headerActions(v: HTMLElement[] | null) {
    this.headerActionsRef = v
    this.build()
  }
  get headerActions(): HTMLElement[] | null {
    return this.headerActionsRef
  }

  connectedCallback(): void {
    this.build()
  }

  disconnectedCallback(): void {
    this.teardown()
  }

  attributeChangedCallback(name: string): void {
    if (!this.isConnected) return
    if (name === 'theme' && this.core) {
      const t = this.getAttribute('theme')
      this.core.setTheme(t === 'dark' || t === 'light' ? t : 'auto')
      return
    }
    this.build()
  }

  /** Open the picker dialog. */
  openPicker(): void {
    this.core?.open()
  }

  /** Close the picker dialog. */
  closePicker(): void {
    this.core?.close()
  }

  private build(): void {
    if (!this.isConnected || !this.adapterRef) return
    this.teardown()

    const themeAttr = this.getAttribute('theme')
    const theme: FilePickerOptions['theme'] =
      themeAttr === 'dark' || themeAttr === 'light' ? themeAttr : 'auto'
    const perPage = this.getAttribute('per-page')
    const layout = this.getAttribute('layout')
    // Boolean toggles default to true; an explicit `="false"` disables them.
    const bool = (name: string): boolean => this.getAttribute(name) !== 'false'
    const numAttr = (name: string): number | undefined => {
      const raw = this.getAttribute(name)
      if (raw == null || raw === '') return undefined
      const n = Number(raw)
      return Number.isFinite(n) ? n : undefined
    }
    const maxSelection = numAttr('max-selection')
    const searchDebounce = numAttr('search-debounce')
    const options: FilePickerOptions = {
      adapter: this.adapterRef,
      multiple: this.hasAttribute('multiple'),
      theme,
      allowUpload: bool('allow-upload'),
      allowEdit: bool('allow-edit'),
      allowDelete: bool('allow-delete'),
      manageFolders: bool('manage-folders'),
      ...(this.getAttribute('title') ? { title: this.getAttribute('title') as string } : {}),
      ...(this.getAttribute('accept') ? { accept: this.getAttribute('accept') as string } : {}),
      ...(this.getAttribute('class-name')
        ? { className: this.getAttribute('class-name') as string }
        : {}),
      ...(layout === 'modal' || layout === 'fullscreen' ? { layout } : {}),
      ...(perPage ? { perPage: Number(perPage) } : {}),
      ...(this.selectedRef.length ? { selected: this.selectedRef } : {}),
      ...(this.typeFiltersRef ? { typeFilters: this.typeFiltersRef } : {}),
      ...(this.fileIconsRef ? { fileIcons: this.fileIconsRef } : {}),
      ...(this.fileColorsRef ? { fileColors: this.fileColorsRef } : {}),
      ...(this.labelsRef ? { labels: this.labelsRef } : {}),
      ...(this.hasAttribute('close-on-select')
        ? { closeOnSelect: this.getAttribute('close-on-select') !== 'false' }
        : {}),
      ...(maxSelection != null ? { maxSelection } : {}),
      ...(searchDebounce != null ? { searchDebounce } : {}),
      ...(this.perPageOptionsRef ? { perPageOptions: this.perPageOptionsRef } : {}),
      ...(this.renderEmptyRef ? { renderEmpty: this.renderEmptyRef } : {}),
      ...(this.renderLoadingRef ? { renderLoading: this.renderLoadingRef } : {}),
      ...(this.renderCardMetaRef ? { renderCardMeta: this.renderCardMetaRef } : {}),
      ...(this.headerActionsRef ? { headerActions: this.headerActionsRef } : {}),
    }

    const core = new FilePickerCore(options)
    this.core = core
    this.disposers.push(
      core.on('select', (i) => this.emit('select', i)),
      core.on('change', (i) => this.emit('change', i)),
      core.on('upload', (i) => this.emit('upload', i)),
      core.on('open', () => this.emit('open')),
      core.on('close', () => this.emit('close')),
      core.on('delete', (item) => this.emit('delete', item)),
      core.on('error', (err) => this.emit('error', err)),
      core.on('theme', (t) => this.emit('theme', t)),
    )

    const label = this.getAttribute('label') ?? 'Select File'
    this.disposers.push(core.mountTrigger(this, { label }))
    if (this.getAttribute('show-selected') !== 'false') {
      this.disposers.push(core.mountSelected(this))
    }
  }

  private teardown(): void {
    for (const dispose of this.disposers) dispose()
    this.disposers = []
    this.core?.destroy()
    this.core = null
    this.innerHTML = ''
  }

  private emit(name: string, detail?: unknown): void {
    this.dispatchEvent(new CustomEvent(`fp:${name}`, { detail, bubbles: true }))
  }
}

/** Register `<file-picker>` (idempotent). Called automatically on import. */
export function register(tag = 'file-picker'): void {
  if (typeof customElements !== 'undefined' && !customElements.get(tag)) {
    customElements.define(tag, FilePickerElement)
  }
}

register()

export type {
  FilePickerOptions,
  FilePickerLabels,
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
  TypeFilterOption,
} from '@anil-labs/file-picker-core'
