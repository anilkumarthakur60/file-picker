import { FilePicker as FilePickerCore } from '@anil-labs/file-picker-core'
import type { FilePickerAdapter, FilePickerOptions, MediaItem } from '@anil-labs/file-picker-core'

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
export class FilePickerElement extends HTMLElement {
  private core: FilePickerCore | null = null
  private adapterRef: FilePickerAdapter | null = null
  private disposers: (() => void)[] = []

  static readonly observedAttributes = [
    'multiple',
    'label',
    'theme',
    'title',
    'per-page',
    'show-selected',
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

  /** Currently-selected items. */
  get selected(): MediaItem[] {
    return this.core?.getSelected() ?? []
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
    const options: FilePickerOptions = {
      adapter: this.adapterRef,
      multiple: this.hasAttribute('multiple'),
      theme,
      ...(this.getAttribute('title') ? { title: this.getAttribute('title') as string } : {}),
      ...(perPage ? { perPage: Number(perPage) } : {}),
    }

    const core = new FilePickerCore(options)
    this.core = core
    this.disposers.push(
      core.on('select', (i) => this.emit('select', i)),
      core.on('change', (i) => this.emit('change', i)),
      core.on('upload', (i) => this.emit('upload', i)),
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

  private emit(name: string, items: MediaItem[]): void {
    this.dispatchEvent(new CustomEvent(`fp:${name}`, { detail: items, bubbles: true }))
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
  MediaItem,
  MediaFolder,
  FilePickerAdapter,
} from '@anil-labs/file-picker-core'
