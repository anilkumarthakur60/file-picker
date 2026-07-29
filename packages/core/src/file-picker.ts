import { append, clear, el, on } from './dom'
import { icon } from './icons'
import { FolderSelect } from './folder-select'
import { defaultLabels } from './labels'
import { Emitter, type FilePickerEventMap, type FilePickerEventName } from './events'
import {
  DEFAULT_FILE_COLORS,
  DEFAULT_FILE_ICONS,
  formatSize,
  isFolderId,
  isImage,
  PER_PAGE_OPTIONS,
  TYPE_FILTER_OPTIONS,
} from './utils'
import type {
  FilePickerAdapter,
  FilePickerLabels,
  FilePickerOptions,
  FolderScope,
  MediaEditForm,
  MediaFolder,
  MediaId,
  MediaItem,
  TypeFilterOption,
} from './types'

interface ResolvedOptions {
  multiple: boolean
  perPage: number
  perPageOptions: number[]
  typeFilters: TypeFilterOption[]
  theme: 'light' | 'dark' | 'auto'
  themeToggle: boolean
  className: string
  title: string
  accept: string
  manageFolders: boolean
  allowUpload: boolean
  allowEdit: boolean
  allowDelete: boolean
  searchDebounce: number
  closeOnSelect: boolean
  maxSelection: number | null
  layout: 'fullscreen' | 'modal'
}

const esc = (s: string): string =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c,
  )

const idStr = (id: MediaId | null): string => (id == null ? '' : String(id))

let fpUid = 0
/** A per-instance unique id, for `aria-labelledby` / `aria-controls` wiring. */
const nextId = (): string => `fp-${++fpUid}`

/**
 * A framework-agnostic media-library file picker. Renders its own dialog UI and
 * talks to your backend through a {@link FilePickerAdapter}.
 */
export class FilePicker {
  private readonly adapter: FilePickerAdapter
  private readonly o: ResolvedOptions
  private readonly emitter = new Emitter()

  // ── state ──────────────────────────────────────────────────────────
  private media: MediaItem[] = []
  private folders: MediaFolder[] = []
  private selected: MediaItem[] = []
  private checkbox: Record<string, boolean> = {}
  private lastIndex: number | null = null
  private page = 1
  private lastPage = 1
  private filterSearch = ''
  private filterTag = ''
  private filterType: string | null = null
  private filterFolder: FolderScope = null
  private uploadFolder: FolderScope = null
  private loading = false
  private opened = false

  // ── DOM ────────────────────────────────────────────────────────────
  private readonly overlay: HTMLElement
  private gridEl!: HTMLElement
  private pagerEl!: HTMLElement
  private countChip!: HTMLElement
  private footerPrimary!: HTMLButtonElement
  private folderFilter!: FolderSelect
  private uploadOverlay!: HTMLElement
  private editOverlay!: HTMLElement
  private previewOverlay!: HTMLElement
  private previewBody!: HTMLElement
  private modalHost!: HTMLElement

  private readonly selectedHosts = new Set<HTMLElement>()
  /** Teardowns for trigger/selected hosts mounted via mountTrigger/mountSelected. */
  private readonly mountDisposers: (() => void)[] = []
  private readonly disposers: (() => void)[] = []
  private searchTimer: ReturnType<typeof setTimeout> | undefined
  private tagTimer: ReturnType<typeof setTimeout> | undefined
  private theme: 'light' | 'dark' | 'auto' = 'auto'
  private themeIcon: HTMLElement | null = null
  private readonly themedRoots: HTMLElement[] = []
  private dialogCard!: HTMLElement
  private filtersEl!: HTMLElement
  private filtersBackdrop!: HTMLElement

  // ── lifecycle / async guards ───────────────────────────────────────
  private destroyed = false
  private fetchToken = 0
  private folderToken = 0
  private total = 0
  private loadError: unknown = null
  private readonly pagerDisposers: (() => void)[] = []
  private readonly modalDisposers: (() => void)[] = []
  private uploadFolderSelect?: FolderSelect
  private editFolderSelect?: FolderSelect
  private osThemeDispose?: () => void

  // ── a11y / focus ───────────────────────────────────────────────────
  private prevFocus: HTMLElement | null = null
  private modalPrevFocus: HTMLElement | null = null
  private activeCardIndex = 0
  private readonly miniStack: HTMLElement[] = []
  private readonly miniCancel = new WeakMap<HTMLElement, () => void>()

  // ── feedback ───────────────────────────────────────────────────────
  private toastHost!: HTMLElement
  private liveRegion!: HTMLElement
  private readonly toastTimers: ReturnType<typeof setTimeout>[] = []
  private prevBodyOverflow = ''
  private stylesheetWarned = false
  private uploading = false
  private filterSearchEl?: HTMLInputElement
  private filterTagEl?: HTMLInputElement
  private filterTypeEl?: HTMLSelectElement
  private readonly fileIconMap: Record<string, string>
  private readonly fileColorMap: Record<string, string>
  private readonly L: FilePickerLabels
  private readonly renderEmptyHook?: () => string
  private readonly renderLoadingHook?: () => string
  private readonly renderCardMetaHook?: (item: MediaItem) => string
  private readonly headerActionsHook: HTMLElement[]

  constructor(options: FilePickerOptions) {
    if (typeof document === 'undefined') {
      throw new Error(
        '[file-picker] FilePicker renders to the DOM and must be constructed in the browser. ' +
          'During SSR, create it inside an effect / onMount (or dynamic-import the web component client-side).',
      )
    }
    if (!options.adapter) {
      throw new Error(
        '[file-picker] `adapter` is required — pass createRestAdapter(...), createMemoryAdapter(...), ' +
          'or your own FilePickerAdapter.',
      )
    }
    this.adapter = options.adapter
    this.L = { ...defaultLabels, ...(options.labels ?? {}) }
    this.o = {
      multiple: options.multiple ?? false,
      // Clamp: perPage 0 would make lastPage Infinity and the grid always empty.
      perPage: Math.max(1, Math.floor(options.perPage ?? 24)),
      perPageOptions: options.perPageOptions ?? PER_PAGE_OPTIONS,
      typeFilters: options.typeFilters ?? TYPE_FILTER_OPTIONS,
      theme: options.theme ?? 'auto',
      themeToggle: options.themeToggle ?? true,
      className: options.className ?? '',
      title: options.title ?? this.L.title,
      accept: options.accept ?? '',
      manageFolders: options.manageFolders ?? true,
      allowUpload: options.allowUpload ?? true,
      allowEdit: options.allowEdit ?? true,
      allowDelete: options.allowDelete ?? true,
      searchDebounce: options.searchDebounce ?? 400,
      closeOnSelect: options.closeOnSelect ?? !(options.multiple ?? false),
      maxSelection: options.maxSelection ?? null,
      layout: options.layout ?? 'fullscreen',
    }
    this.fileIconMap = { ...DEFAULT_FILE_ICONS, ...(options.fileIcons ?? {}) }
    this.fileColorMap = { ...DEFAULT_FILE_COLORS, ...(options.fileColors ?? {}) }
    this.renderEmptyHook = options.renderEmpty
    this.renderLoadingHook = options.renderLoading
    this.renderCardMetaHook = options.renderCardMeta
    this.headerActionsHook = options.headerActions ?? []
    this.theme = this.o.theme
    this.applySelected(options.selected ?? null)
    this.overlay = el('div', {
      class: this.rootClass(
        this.o.layout === 'modal' ? 'fp-overlay fp-overlay--modal' : 'fp-overlay',
      ),
      hidden: true,
    })
    this.buildDialog()
    this.buildUploadDialog()
    this.buildEditDialog()
    this.buildPreview()
    this.modalHost = el('div', { class: this.rootClass('fp-modal-host') })
    this.toastHost = el('div', {
      class: this.rootClass('fp-toasts'),
      role: 'status',
      'aria-live': 'polite',
    })
    this.liveRegion = el('div', { class: 'fp-sr-only', 'aria-live': 'polite' })
    this.themedRoots.push(
      this.overlay,
      this.uploadOverlay,
      this.editOverlay,
      this.previewOverlay,
      this.modalHost,
      this.toastHost,
    )
    this.applyTheme()
    this.watchOsTheme()
    document.body.append(
      this.overlay,
      this.uploadOverlay,
      this.editOverlay,
      this.previewOverlay,
      this.modalHost,
      this.toastHost,
      this.liveRegion,
    )
    this.disposers.push(on(document, 'keydown', (e) => this.onKeydown(e)))
    void this.loadFolders()
  }

  private rootClass(base: string): string {
    return `fp ${base}${this.o.className ? ` ${this.o.className}` : ''}`
  }

  /** The effective theme, resolving `'auto'` against the OS preference. */
  get resolvedTheme(): 'light' | 'dark' {
    if (this.theme !== 'auto') return this.theme
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  /** Switch the color theme at runtime (`'light' | 'dark' | 'auto'`). */
  setTheme(theme: 'light' | 'dark' | 'auto'): void {
    this.theme = theme
    this.applyTheme()
    this.emitter.emit('theme', theme)
  }

  private applyTheme(): void {
    for (const root of this.themedRoots) this.applyThemeTo(root)
    if (this.themeIcon) {
      this.themeIcon.innerHTML = icon(this.resolvedTheme === 'dark' ? 'sun' : 'moon', 20)
    }
  }

  private applyThemeTo(node: HTMLElement): void {
    node.classList.toggle('fp--dark', this.theme === 'dark')
    node.classList.toggle('fp--light', this.theme === 'light')
  }

  private trackThemed(node: HTMLElement): void {
    this.themedRoots.push(node)
    this.applyThemeTo(node)
  }

  private untrackThemed(node: HTMLElement): void {
    const i = this.themedRoots.indexOf(node)
    if (i >= 0) this.themedRoots.splice(i, 1)
  }

  /** Re-apply the theme when the OS preference flips (only matters while `auto`). */
  private watchOsTheme(): void {
    if (typeof matchMedia === 'undefined') return
    const mq = matchMedia('(prefers-color-scheme: dark)')
    const handler = (): void => {
      if (this.theme === 'auto') this.applyTheme()
    }
    mq.addEventListener('change', handler)
    this.osThemeDispose = () => mq.removeEventListener('change', handler)
  }

  /** Run and empty a disposer bucket (used for re-rendered / re-opened regions). */
  private flush(bucket: (() => void)[]): void {
    for (const d of bucket) d()
    bucket.length = 0
  }

  /**
   * Wrap a mount teardown so it runs at most once and is tracked in
   * {@link mountDisposers}, letting `destroy()` clean up trigger/selected hosts
   * the caller never disposed. Manual disposal removes it from the bucket.
   */
  private trackMount(teardown: () => void): () => void {
    let done = false
    const dispose = (): void => {
      if (done) return
      done = true
      const i = this.mountDisposers.indexOf(dispose)
      if (i >= 0) this.mountDisposers.splice(i, 1)
      teardown()
    }
    this.mountDisposers.push(dispose)
    return dispose
  }

  /** Show a transient toast (also announced to screen readers via `toastHost`). */
  private toast(message: string, kind: 'success' | 'error' | 'info' = 'info'): void {
    const t = el(
      'div',
      { class: `fp-toast fp-toast--${kind}` },
      el('span', { class: 'fp-toast-ico', html: icon(kind === 'error' ? 'alert' : 'check', 16) }),
      el('span', {}, message),
    )
    this.toastHost.append(t)
    // Self-trimming timers so toastTimers doesn't grow unbounded over a long
    // session; destroy() clears whatever is still pending.
    const schedule = (fn: () => void, ms: number): void => {
      const id = setTimeout(() => {
        const i = this.toastTimers.indexOf(id)
        if (i >= 0) this.toastTimers.splice(i, 1)
        fn()
      }, ms)
      this.toastTimers.push(id)
    }
    schedule(() => {
      t.classList.add('fp-toast--out')
      schedule(() => t.remove(), 200)
    }, 3500)
  }

  /** Announce a status message to assistive tech (no visible UI). */
  private announce(message: string): void {
    this.liveRegion.textContent = message
  }

  /** Per-type icon key, honoring the `fileIcons` override. */
  private fileIcon(type: string): string {
    return this.fileIconMap[type] ?? 'file'
  }

  /** Per-type accent color, honoring the `fileColors` override. */
  private fileColor(type: string): string {
    return this.fileColorMap[type] ?? '#78909c'
  }

  /** Whether an item can be shown in the in-dialog preview (image/video/audio). */
  private previewable(m: MediaItem): boolean {
    return isImage(m) || m.type === 'video' || m.type === 'audio'
  }

  /** Filter files against the `accept` option (browsers only enforce it for the file dialog). */
  private acceptFilter(files: File[]): File[] {
    const accept = this.o.accept.trim()
    if (!accept) return files
    const rules = accept
      .split(',')
      .map((r) => r.trim().toLowerCase())
      .filter(Boolean)
    return files.filter((f) => {
      const name = f.name.toLowerCase()
      const type = f.type.toLowerCase()
      return rules.some((rule) => {
        if (rule.startsWith('.')) return name.endsWith(rule)
        if (rule.endsWith('/*')) return type.startsWith(rule.slice(0, -1))
        return type === rule
      })
    })
  }

  private lockScroll(): void {
    this.prevBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  }

  private unlockScroll(): void {
    document.body.style.overflow = this.prevBodyOverflow
  }

  /** Once per instance, warn if the stylesheet wasn't imported (top onboarding trap). */
  private warnIfUnstyled(): void {
    if (this.stylesheetWarned || typeof getComputedStyle === 'undefined') return
    this.stylesheetWarned = true
    if (getComputedStyle(this.overlay).position !== 'fixed' && typeof console !== 'undefined') {
      console.warn(
        "[file-picker] the dialog looks unstyled — did you import '@anil-labs/file-picker-core/styles.css'?",
      )
    }
  }

  private setFiltersOpen(open: boolean): void {
    this.dialogCard.classList.toggle('fp-dialog--filters', open)
  }

  // ── public API ─────────────────────────────────────────────────────

  on<E extends FilePickerEventName>(
    event: E,
    handler: (...a: FilePickerEventMap[E]) => void,
  ): () => void {
    return this.emitter.on(event, handler)
  }

  open(): void {
    if (this.opened) return
    this.opened = true
    this.prevFocus = (document.activeElement as HTMLElement) ?? null
    this.overlay.hidden = false
    this.lockScroll()
    this.warnIfUnstyled()
    this.dialogCard.focus()
    this.emitter.emit('open')
    void this.fetchData()
  }

  close(): void {
    if (!this.opened) return
    this.opened = false
    this.overlay.hidden = true
    this.setFiltersOpen(false)
    this.unlockScroll()
    this.prevFocus?.focus?.()
    this.prevFocus = null
    this.emitter.emit('close')
  }

  get isOpen(): boolean {
    return this.opened
  }

  getSelected(): MediaItem[] {
    return [...this.selected]
  }

  setSelected(value: MediaItem[] | MediaItem | null): void {
    this.applySelected(value)
    this.syncCheckboxes()
    this.renderGrid()
    this.renderSelectedHosts()
  }

  /** Mount a trigger button into `container` that opens the picker. */
  mountTrigger(container: HTMLElement, opts: { label?: string } = {}): () => void {
    const btn = el(
      'button',
      { type: 'button', class: this.rootClass('fp-trigger') },
      el('span', { html: icon('image', 18) }),
      el('span', {}, opts.label ?? this.L.triggerLabel),
    )
    this.trackThemed(btn)
    const off = on(btn, 'click', () => this.open())
    container.append(btn)
    return this.trackMount(() => {
      off()
      btn.remove()
      this.untrackThemed(btn)
    })
  }

  /** Mount a selected-thumbnails strip into `container`. Auto-updates. */
  mountSelected(container: HTMLElement): () => void {
    const host = el('div', { class: this.rootClass('fp-selected') })
    this.trackThemed(host)
    container.append(host)
    this.selectedHosts.add(host)
    this.renderSelectedHost(host)
    const off = on(host, 'error', (e) => this.onImgError(e), { capture: true })
    return this.trackMount(() => {
      off()
      this.selectedHosts.delete(host)
      host.remove()
      this.untrackThemed(host)
    })
  }

  destroy(): void {
    this.destroyed = true
    clearTimeout(this.searchTimer)
    clearTimeout(this.tagTimer)
    // Invalidate any in-flight adapter calls so their continuations no-op.
    this.fetchToken++
    this.folderToken++
    for (const d of this.disposers) d()
    this.disposers.length = 0
    this.flush(this.pagerDisposers)
    this.flush(this.modalDisposers)
    this.osThemeDispose?.()
    this.folderFilter.destroy()
    this.uploadFolderSelect?.destroy()
    this.editFolderSelect?.destroy()
    for (const timer of this.toastTimers) clearTimeout(timer)
    this.toastTimers.length = 0
    this.emitter.clear()
    this.unlockScroll()
    // Tear down trigger/selected hosts the caller mounted but never disposed —
    // removes their nodes and listeners so a dead instance can't respond to
    // trigger clicks. Iterate a copy since each dispose splices itself out.
    for (const dispose of [...this.mountDisposers]) dispose()
    this.mountDisposers.length = 0
    for (const node of [
      this.overlay,
      this.uploadOverlay,
      this.editOverlay,
      this.previewOverlay,
      this.modalHost,
      this.toastHost,
      this.liveRegion,
    ]) {
      node.remove()
    }
    this.selectedHosts.clear()
    this.adapter.dispose?.()
  }

  // ── selection ──────────────────────────────────────────────────────

  private applySelected(value: MediaItem[] | MediaItem | null | undefined): void {
    const arr = value ? (Array.isArray(value) ? value : [value]) : []
    this.selected = this.o.multiple ? [...arr] : arr.slice(0, 1)
    this.checkbox = {}
    this.lastIndex = null
    for (const m of this.selected) this.checkbox[idStr(m.id)] = true
  }

  private updateSelected(item: MediaItem, checked: boolean): void {
    const key = idStr(item.id)
    if (checked) {
      if (this.o.multiple) {
        const already = this.selected.some((m) => idStr(m.id) === key)
        if (
          !already &&
          this.o.maxSelection != null &&
          this.selected.length >= this.o.maxSelection
        ) {
          this.toast(this.L.maxSelection(this.o.maxSelection), 'info')
          return
        }
        if (!already) this.selected.push(item)
      } else {
        this.selected = [item]
        this.checkbox = {}
      }
    } else {
      this.selected = this.selected.filter((m) => idStr(m.id) !== key)
    }
    this.checkbox[key] = checked
    this.afterSelectionChange()
    if (checked && !this.o.multiple && this.o.closeOnSelect && this.opened) this.submit()
  }

  private toggleMedia(item: MediaItem, event?: { shiftKey?: boolean }): void {
    const index = this.media.findIndex((m) => idStr(m.id) === idStr(item.id))
    if (event?.shiftKey && this.o.multiple && this.lastIndex != null && index !== -1) {
      const start = Math.min(this.lastIndex, index)
      const end = Math.max(this.lastIndex, index)
      for (let i = start; i <= end; i++) {
        const m = this.media[i]
        if (m && !this.checkbox[idStr(m.id)]) this.updateSelectedQuiet(m, true)
      }
      this.lastIndex = index
      this.afterSelectionChange()
      return
    }
    this.lastIndex = index !== -1 ? index : null
    this.updateSelected(item, !this.checkbox[idStr(item.id)])
  }

  private updateSelectedQuiet(item: MediaItem, checked: boolean): void {
    const key = idStr(item.id)
    if (checked && this.o.maxSelection != null && this.selected.length >= this.o.maxSelection)
      return
    if (checked && !this.selected.some((m) => idStr(m.id) === key)) this.selected.push(item)
    this.checkbox[key] = checked
  }

  private clearAll(): void {
    this.selected = []
    this.checkbox = {}
    this.lastIndex = null
    this.afterSelectionChange()
  }

  private afterSelectionChange(): void {
    // Selection-only change: patch the affected cards in place instead of
    // rebuilding the whole grid innerHTML (avoids re-parsing SVGs, recreating
    // <img>s and re-triggering fallback errors on every checkbox toggle).
    this.syncCardSelection()
    this.renderCountChip()
    this.renderSelectedHosts()
    this.emitter.emit('change', this.getSelected())
  }

  /** Update only the selection-dependent bits (class/aria/checkbox) of each card. */
  private syncCardSelection(): void {
    if (!this.gridEl) return
    for (const card of this.gridEl.querySelectorAll<HTMLElement>('.fp-card')) {
      const id = card.getAttribute('data-id')
      const sel = id != null && !!this.checkbox[id]
      card.classList.toggle('fp-card--selected', sel)
      card.setAttribute('aria-selected', sel ? 'true' : 'false')
      const box = card.querySelector<HTMLInputElement>('.fp-card-check input')
      if (box) box.checked = sel
    }
  }

  private syncCheckboxes(): void {
    const next: Record<string, boolean> = {}
    for (const m of this.selected) next[idStr(m.id)] = true
    this.checkbox = next
  }

  // ── data ───────────────────────────────────────────────────────────

  private async fetchData(): Promise<void> {
    if (this.destroyed) return
    // Generation token: a slower earlier request must not clobber a newer one.
    const token = ++this.fetchToken
    this.loading = true
    this.renderGrid()
    this.announce(this.L.loading)
    try {
      const res = await this.adapter.listMedia({
        page: this.page,
        perPage: this.o.perPage,
        search: this.filterSearch || null,
        tag: this.filterTag || null,
        type: this.filterType,
        folder: this.filterFolder,
      })
      if (token !== this.fetchToken || this.destroyed) return
      this.media = res.items
      this.total = res.total
      this.lastPage = res.lastPage ?? Math.max(1, Math.ceil(res.total / this.o.perPage))
      this.loadError = null
      // The media array was replaced — a stale shift-range anchor is meaningless.
      this.lastIndex = null
      this.announce(this.L.results(this.total))
    } catch (err) {
      if (token !== this.fetchToken || this.destroyed) return
      this.loadError = err
      if (this.media.length) {
        // A background refetch failed but content is already on screen — keep
        // it and surface the failure as a toast, rather than wiping to a
        // full-page error state.
        this.toast(this.L.errorTitle, 'error')
      } else {
        this.announce(this.L.errorTitle)
      }
      this.emitter.emit('error', err)
    } finally {
      if (token === this.fetchToken && !this.destroyed) {
        this.loading = false
        this.renderGrid()
        this.renderPager()
      }
    }
  }

  private async loadFolders(): Promise<void> {
    if (this.destroyed) return
    const token = ++this.folderToken
    try {
      const folders = await this.adapter.listFolders()
      if (token !== this.folderToken || this.destroyed) return
      this.folders = folders
      this.folderFilter.refresh()
      this.uploadFolderSelect?.refresh()
      this.editFolderSelect?.refresh()
    } catch (err) {
      if (token !== this.folderToken || this.destroyed) return
      this.emitter.emit('error', err)
    }
  }

  // ── main dialog ────────────────────────────────────────────────────

  private buildDialog(): void {
    this.countChip = el('button', {
      type: 'button',
      class: 'fp-chip',
      hidden: true,
      'aria-label': this.L.clearSelection,
    })
    this.disposers.push(on(this.countChip, 'click', () => this.clearAll()))

    const headerClose = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn fp-header-close',
        title: this.L.close,
        'aria-label': this.L.close,
      },
      el('span', { html: icon('close', 20) }),
    )
    this.disposers.push(on(headerClose, 'click', () => this.close()))

    const titleId = nextId()
    const header = el('div', { class: 'fp-header' })
    const bar = el(
      'div',
      { class: 'fp-toolbar' },
      el('div', { class: 'fp-title', id: titleId }, this.o.title),
      this.countChip,
      el('div', { class: 'fp-toolbar-actions' }),
    )
    const actions = bar.querySelector('.fp-toolbar-actions') as HTMLElement

    const filtersToggle = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn fp-filters-toggle',
        title: this.L.filters,
        'aria-label': this.L.filters,
      },
      el('span', { html: icon('sliders', 20) }),
    )
    this.disposers.push(on(filtersToggle, 'click', () => this.setFiltersOpen(true)))
    actions.append(filtersToggle)

    if (this.o.themeToggle) {
      this.themeIcon = el('span', { html: icon('moon', 20) })
      const themeBtn = el(
        'button',
        {
          type: 'button',
          class: 'fp-icon-btn',
          title: this.L.toggleTheme,
          'aria-label': this.L.toggleTheme,
        },
        this.themeIcon,
      )
      this.disposers.push(
        on(themeBtn, 'click', () =>
          this.setTheme(this.resolvedTheme === 'dark' ? 'light' : 'dark'),
        ),
      )
      actions.append(themeBtn)
    }

    if (this.o.allowUpload) {
      const up = el(
        'button',
        {
          type: 'button',
          class: 'fp-icon-btn fp-up',
          title: this.L.upload,
          'aria-label': this.L.upload,
        },
        el('span', { html: icon('upload', 20) }),
      )
      this.disposers.push(on(up, 'click', () => this.openUpload()))
      actions.append(up)
    }
    for (const btn of this.headerActionsHook) actions.append(btn)
    actions.append(headerClose)

    const cancelBtn = el('button', { type: 'button', class: 'fp-btn fp-btn--ghost' }, this.L.cancel)
    this.disposers.push(on(cancelBtn, 'click', () => this.close()))
    this.footerPrimary = el(
      'button',
      { type: 'button', class: 'fp-btn fp-btn--primary' },
      this.L.selectAction(this.selected.length),
    )
    this.disposers.push(on(this.footerPrimary, 'click', () => this.submit()))
    const footer = el('div', { class: 'fp-footer' }, cancelBtn, this.footerPrimary)

    this.filtersEl = this.buildFilters()
    this.filtersBackdrop = el('div', { class: 'fp-filters-backdrop' })
    this.disposers.push(on(this.filtersBackdrop, 'click', () => this.setFiltersOpen(false)))
    header.append(bar)

    this.gridEl = el('div', { class: 'fp-grid-scroll' })
    this.disposers.push(
      on(this.gridEl, 'click', (e) => this.onGridClick(e)),
      on(this.gridEl, 'keydown', (e) => this.onGridKeydown(e)),
      on(this.gridEl, 'error', (e) => this.onImgError(e), { capture: true }),
      on(this.gridEl, 'focusin', (e) => {
        const c = (e.target as HTMLElement).closest<HTMLElement>('.fp-card')
        if (c) this.activeCardIndex = Number(c.getAttribute('data-index')) || 0
      }),
    )
    this.pagerEl = el('div', { class: 'fp-pager' })

    // The filters drawer and its backdrop are direct children of the dialog
    // (not the sticky header) so that on mobile the drawer's absolute box
    // resolves against the full-height dialog and its z-index isn't trapped
    // inside the header's stacking context (which would hide it behind the
    // backdrop).
    this.dialogCard = el(
      'div',
      {
        class: this.o.layout === 'modal' ? 'fp-dialog fp-dialog--modal' : 'fp-dialog',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': titleId,
        tabindex: '-1',
      },
      header,
      this.filtersEl,
      this.filtersBackdrop,
      this.gridEl,
      el('div', { class: 'fp-sep' }),
      this.pagerEl,
      el('div', { class: 'fp-sep' }),
      footer,
    )
    this.disposers.push(
      on(this.overlay, 'click', (e) => {
        if (e.target === this.overlay) this.close()
      }),
    )
    this.overlay.append(this.dialogCard)
    this.renderGrid()
  }

  private buildFilters(): HTMLElement {
    this.folderFilter = new FolderSelect({
      getFolders: () => this.folders,
      value: null,
      label: this.L.folderLabel,
      labels: this.L,
      manageable: this.o.manageFolders,
      onChange: (v) => {
        this.filterFolder = v
        this.page = 1
        this.setFiltersOpen(false)
        void this.fetchData()
      },
      onCreate: (name) => this.createFolder(name),
      onDelete: (id) => this.deleteFolder(id),
      onRename: (id, name) => this.renameFolder(id, name),
      promptText: (t, m, d) => this.promptText(t, m, d),
      confirm: (t, m) => this.confirm(t, m),
    })

    const search = el('input', {
      type: 'search',
      class: 'fp-input',
      placeholder: this.L.searchPlaceholder,
      'aria-label': this.L.searchPlaceholder,
    })
    this.filterSearchEl = search
    this.disposers.push(
      on(search, 'input', () => {
        clearTimeout(this.searchTimer)
        this.searchTimer = setTimeout(() => {
          this.filterSearch = search.value
          this.page = 1
          void this.fetchData()
        }, this.o.searchDebounce)
      }),
    )
    const tag = el('input', {
      type: 'search',
      class: 'fp-input',
      placeholder: this.L.tagPlaceholder,
      'aria-label': this.L.tagPlaceholder,
    })
    this.filterTagEl = tag
    this.disposers.push(
      on(tag, 'input', () => {
        clearTimeout(this.tagTimer)
        this.tagTimer = setTimeout(() => {
          this.filterTag = tag.value
          this.page = 1
          void this.fetchData()
        }, this.o.searchDebounce)
      }),
    )

    const typeSel = el(
      'select',
      { class: 'fp-input fp-select', 'aria-label': this.L.allTypes },
      el('option', { value: '' }, this.L.allTypes),
    )
    for (const t of this.o.typeFilters) typeSel.append(el('option', { value: t.value }, t.label))
    this.filterTypeEl = typeSel
    this.disposers.push(
      on(typeSel, 'change', () => {
        this.filterType = typeSel.value || null
        this.page = 1
        this.setFiltersOpen(false)
        void this.fetchData()
      }),
    )

    const clearBtn = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn',
        title: this.L.clearFilters,
        'aria-label': this.L.clearFilters,
      },
      el('span', { html: icon('filterOff', 18) }),
    )
    this.disposers.push(on(clearBtn, 'click', () => this.clearFilters()))
    const refreshBtn = el(
      'button',
      { type: 'button', class: 'fp-icon-btn', title: this.L.refresh, 'aria-label': this.L.refresh },
      el('span', { html: icon('refresh', 18) }),
    )
    this.disposers.push(on(refreshBtn, 'click', () => void this.fetchData()))

    const filtersClose = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn',
        title: this.L.closeFilters,
        'aria-label': this.L.closeFilters,
      },
      el('span', { html: icon('close', 18) }),
    )
    this.disposers.push(on(filtersClose, 'click', () => this.setFiltersOpen(false)))

    return el(
      'div',
      { class: 'fp-filters' },
      el(
        'div',
        { class: 'fp-filters-head' },
        el('span', { class: 'fp-filters-head-title' }, this.L.filters),
        filtersClose,
      ),
      el('div', { class: 'fp-filter fp-filter-folder' }, this.folderFilter.el),
      el('div', { class: 'fp-filter' }, this.field(icon('search', 18), search)),
      el('div', { class: 'fp-filter' }, this.field(icon('tag', 18), tag)),
      el('div', { class: 'fp-filter' }, this.field(icon('filter', 18), typeSel)),
      el('div', { class: 'fp-filter-actions' }, clearBtn, refreshBtn),
    )
  }

  private field(iconHtml: string, control: HTMLElement): HTMLElement {
    return el(
      'div',
      { class: 'fp-field' },
      el('span', { class: 'fp-field-ico', html: iconHtml }),
      control,
    )
  }

  /** Reset all filters and reload (shared by the clear button and empty state). */
  private clearFilters(): void {
    this.filterSearch = ''
    this.filterTag = ''
    this.filterType = null
    this.filterFolder = null
    if (this.filterSearchEl) this.filterSearchEl.value = ''
    if (this.filterTagEl) this.filterTagEl.value = ''
    if (this.filterTypeEl) this.filterTypeEl.value = ''
    this.folderFilter.setValue(null)
    this.page = 1
    void this.fetchData()
  }

  // ── grid ───────────────────────────────────────────────────────────

  private get filtered(): boolean {
    return !!(this.filterSearch || this.filterTag || this.filterType || this.filterFolder)
  }

  private renderGrid(): void {
    if (!this.gridEl || this.destroyed) return
    if (this.loading) {
      if (this.media.length) {
        // Refetch with content already on screen — dim it in place, don't clear.
        this.gridEl.classList.add('fp-grid-scroll--loading')
        return
      }
      // First load — a skeleton grid reads better than a lone centered spinner.
      const n = Math.min(this.o.perPage, 12)
      const skel = `<div class="fp-skel-card"><div class="fp-skel-thumb"></div><div class="fp-skel-line"></div><div class="fp-skel-line fp-skel-line--sm"></div></div>`
      this.gridEl.innerHTML =
        this.renderLoadingHook?.() ??
        `<div class="fp-grid" aria-hidden="true">${skel.repeat(n)}</div>`
      return
    }
    this.gridEl.classList.remove('fp-grid-scroll--loading')
    if (this.loadError && !this.media.length) {
      this.gridEl.innerHTML = `<div class="fp-state"><span class="fp-state-ico fp-state-ico--error">${icon('alert', 56)}</span><div>${esc(this.L.errorTitle)}</div><small>${esc(this.L.errorBody)}</small><button type="button" class="fp-btn fp-btn--primary fp-state-btn" data-action="retry">${esc(this.L.retry)}</button></div>`
      return
    }
    if (!this.media.length) {
      this.gridEl.innerHTML = this.emptyStateHtml()
      return
    }
    const hadFocus = this.gridEl.contains(document.activeElement)
    this.gridEl.innerHTML = `<div class="fp-grid" role="listbox"${
      this.o.multiple ? ' aria-multiselectable="true"' : ''
    } aria-label="${esc(this.L.gridLabel)}">${this.media.map((m, i) => this.cardHtml(m, i)).join('')}</div>`
    const cards = this.gridEl.querySelectorAll<HTMLElement>('.fp-card')
    if (cards.length) {
      const active = Math.min(Math.max(0, this.activeCardIndex), cards.length - 1)
      this.activeCardIndex = active
      cards.forEach((c, i) => c.setAttribute('tabindex', i === active ? '0' : '-1'))
      if (hadFocus) cards[active]?.focus()
    }
  }

  private emptyStateHtml(): string {
    const L = this.L
    if (this.filtered) {
      return `<div class="fp-state"><span class="fp-state-ico">${icon('search', 52)}</span><div>${esc(L.filteredTitle)}</div><small>${esc(L.filteredBody)}</small><button type="button" class="fp-btn fp-btn--primary fp-state-btn" data-action="clear-filters">${esc(L.clearFilters)}</button></div>`
    }
    if (this.renderEmptyHook) return this.renderEmptyHook()
    const cta = this.o.allowUpload
      ? `<button type="button" class="fp-btn fp-btn--primary fp-state-btn" data-action="upload-empty">${esc(L.emptyUpload)}</button>`
      : ''
    const sub = this.o.allowUpload ? L.emptyBody : L.emptyReadonlyBody
    return `<div class="fp-state"><span class="fp-state-ico">${icon('emptyBox', 56)}</span><div>${esc(L.emptyTitle)}</div><small>${esc(sub)}</small>${cta}</div>`
  }

  /** Swap a failed <img> thumbnail for the file-type icon (CSP-safe, no inline handler). */
  private onImgError(e: Event): void {
    const t = e.target
    if (!(t instanceof HTMLImageElement) || !t.classList.contains('fp-card-img')) return
    const card = t.closest('[data-id]')
    const id = card?.getAttribute('data-id') ?? ''
    const item =
      this.media.find((m) => idStr(m.id) === id) ?? this.selected.find((m) => idStr(m.id) === id)
    const type = item?.type ?? 'other'
    const fallback = el(
      'div',
      { class: 'fp-card-file fp-card-file--broken' },
      el('span', { style: `color:${this.fileColor(type)}`, html: icon(this.fileIcon(type), 34) }),
    )
    t.replaceWith(fallback)
  }

  private cardHtml(m: MediaItem, index = 0): string {
    const isSel = !!this.checkbox[idStr(m.id)]
    const sel = isSel ? ' fp-card--selected' : ''
    const ext = esc((m.extension || '').toUpperCase())
    const thumb = isImage(m)
      ? `<img class="fp-card-img" src="${esc(m.src)}" alt="${esc(m.alt ?? m.filename)}" loading="lazy" />`
      : m.type === 'video'
        ? `<div class="fp-card-file"><span style="color:${this.fileColor(m.type)}">${icon('play', 40)}</span></div>`
        : m.type === 'audio'
          ? `<div class="fp-card-file"><span style="color:${this.fileColor(m.type)}">${icon('audio', 40)}</span></div>`
          : `<div class="fp-card-file"><span style="color:${this.fileColor(m.type)}">${icon(this.fileIcon(m.type), 40)}</span>${ext ? `<span class="fp-ext">${ext}</span>` : ''}</div>`

    const openable = !!m.src && !this.previewable(m)
    const fn = esc(m.filename)
    const L = this.L
    // Action buttons are reached via the card (roving tabindex), so they carry
    // tabindex="-1" — otherwise Tab would stop on up to 4 buttons per card.
    const actions = [
      this.previewable(m)
        ? `<button type="button" class="fp-card-act" data-action="preview" tabindex="-1" title="${esc(L.preview)}" aria-label="${esc(L.preview)} ${fn}">${icon('eye', 15)}</button>`
        : '',
      openable
        ? `<button type="button" class="fp-card-act" data-action="open" tabindex="-1" title="${esc(L.open)}" aria-label="${esc(L.open)} ${fn}">${icon('externalLink', 15)}</button>`
        : '',
      this.o.allowEdit
        ? `<button type="button" class="fp-card-act" data-action="edit" tabindex="-1" title="${esc(L.edit)}" aria-label="${esc(L.edit)} ${fn}">${icon('edit', 15)}</button>`
        : '',
      this.o.allowDelete
        ? `<button type="button" class="fp-card-act" data-action="delete" tabindex="-1" title="${esc(L.delete)}" aria-label="${esc(L.delete)} ${fn}">${icon('trash', 15)}</button>`
        : '',
    ].join('')

    const checked = isSel ? ' checked' : ''
    return `<div class="fp-card${sel}" data-id="${esc(idStr(m.id))}" data-index="${index}" role="option" aria-selected="${isSel ? 'true' : 'false'}" aria-label="${fn}" tabindex="-1">
      ${thumb}
      <label class="fp-card-check" data-action="check" aria-hidden="true"><input type="checkbox"${checked} tabindex="-1" /></label>
      <div class="fp-card-actions">${actions}</div>
      <div class="fp-card-info" dir="auto">
        <span class="fp-card-ico" style="color:${this.fileColor(m.type)}">${icon(this.fileIcon(m.type), 14)}</span>
        <span class="fp-card-name" title="${esc(m.filename)}">${esc(m.filename)}</span>
      </div>
      <div class="fp-card-meta">${this.renderCardMetaHook ? this.renderCardMetaHook(m) : `<span>${ext}</span><span>·</span><span>${formatSize(m.size)}</span>`}</div>
    </div>`
  }

  private onGridClick(e: MouseEvent): void {
    const target = e.target as HTMLElement
    if (target.closest('[data-action="retry"]')) {
      void this.fetchData()
      return
    }
    if (target.closest('[data-action="clear-filters"]')) {
      this.clearFilters()
      return
    }
    if (target.closest('[data-action="upload-empty"]')) {
      this.openUpload()
      return
    }
    const cardEl = target.closest('[data-id]')
    if (!cardEl) return
    const id = cardEl.getAttribute('data-id') ?? ''
    const item = this.media.find((m) => idStr(m.id) === id)
    if (!item) return
    const actionEl = target.closest('[data-action]')
    const action = actionEl?.getAttribute('data-action')
    if (action === 'check') {
      e.preventDefault()
      this.toggleMedia(item, e)
      return
    }
    if (action === 'preview') return this.openPreview(item)
    if (action === 'open') {
      window.open(item.src, '_blank', 'noopener')
      return
    }
    if (action === 'edit') return this.openEdit(item)
    if (action === 'delete') {
      void this.deleteMedia(item)
      return
    }
    this.toggleMedia(item, e)
  }

  private onGridKeydown(e: KeyboardEvent): void {
    const cardEl = (e.target as HTMLElement).closest<HTMLElement>('.fp-card')
    if (!cardEl) return
    const idx = Number(cardEl.getAttribute('data-index')) || 0
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault()
      const item = this.media[idx]
      if (item) this.toggleMedia(item, { shiftKey: e.shiftKey })
      return
    }
    const cols = this.gridColumns()
    let next: number | null = null
    if (e.key === 'ArrowRight') next = idx + 1
    else if (e.key === 'ArrowLeft') next = idx - 1
    else if (e.key === 'ArrowDown') next = idx + cols
    else if (e.key === 'ArrowUp') next = idx - cols
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = this.media.length - 1
    if (next == null) return
    e.preventDefault()
    next = Math.min(Math.max(0, next), this.media.length - 1)
    if (e.shiftKey && this.o.multiple) {
      const item = this.media[next]
      if (item) this.toggleMedia(item, { shiftKey: true })
    }
    this.moveActive(next)
  }

  /** Focus the card at `index`, moving the roving tabindex to it. */
  private moveActive(index: number): void {
    const cards = this.gridEl.querySelectorAll<HTMLElement>('.fp-card')
    if (!cards.length) return
    const next = Math.min(Math.max(0, index), cards.length - 1)
    this.activeCardIndex = next
    cards.forEach((c, i) => c.setAttribute('tabindex', i === next ? '0' : '-1'))
    cards[next]?.focus()
  }

  /** How many cards fit per row (from their laid-out positions). */
  private gridColumns(): number {
    const grid = this.gridEl.querySelector('.fp-grid')
    if (!grid || grid.children.length < 2) return 1
    const top = (grid.children[0] as HTMLElement).offsetTop
    let cols = 1
    for (let i = 1; i < grid.children.length; i++) {
      if ((grid.children[i] as HTMLElement).offsetTop === top) cols++
      else break
    }
    return Math.max(1, cols)
  }

  private renderCountChip(): void {
    const n = this.selected.length
    this.countChip.hidden = n === 0
    this.countChip.innerHTML = `${esc(this.L.selected(n))} <span class="fp-chip-x">${icon('close', 14)}</span>`
    // Keep the count in the accessible name (aria-label otherwise hides it).
    this.countChip.setAttribute('aria-label', `${this.L.clearSelection}, ${this.L.selected(n)}`)
    this.footerPrimary.textContent = this.L.selectAction(n)
  }

  private renderPager(): void {
    clear(this.pagerEl)
    this.flush(this.pagerDisposers)
    const mk = (
      iconName: string,
      disabled: boolean,
      go: () => void,
      title: string,
    ): HTMLButtonElement => {
      const b = el(
        'button',
        { type: 'button', class: 'fp-page-btn', title, 'aria-label': title, disabled },
        el('span', { html: icon(iconName, 16) }),
      )
      if (!disabled) this.pagerDisposers.push(on(b, 'click', go))
      return b
    }
    const first = mk('chevronsLeft', this.page <= 1, () => this.goPage(1), this.L.first)
    const prev = mk(
      'chevronLeft',
      this.page <= 1,
      () => this.goPage(this.page - 1),
      this.L.previous,
    )
    const label = el(
      'span',
      { class: 'fp-page-label' },
      this.L.pageStatus(this.page, this.lastPage, this.total),
    )
    const next = mk(
      'chevronRight',
      this.page >= this.lastPage,
      () => this.goPage(this.page + 1),
      this.L.next,
    )
    const last = mk(
      'chevronsRight',
      this.page >= this.lastPage,
      () => this.goPage(this.lastPage),
      this.L.last,
    )

    const perPage = el('select', {
      class: 'fp-input fp-select fp-perpage',
      title: this.L.itemsPerPage,
      'aria-label': this.L.itemsPerPage,
    })
    for (const n of this.o.perPageOptions) {
      const opt = el('option', { value: String(n) }, this.L.perPageOption(n))
      if (n === this.o.perPage) opt.selected = true
      perPage.append(opt)
    }
    this.pagerDisposers.push(
      on(perPage, 'change', () => {
        this.o.perPage = Number(perPage.value)
        this.page = 1
        void this.fetchData()
      }),
    )
    append(this.pagerEl, first, prev, label, next, last, perPage)
  }

  private goPage(page: number): void {
    this.page = Math.min(Math.max(1, page), this.lastPage)
    void this.fetchData()
  }

  private submit(): void {
    this.emitter.emit('select', this.getSelected())
    this.close()
  }

  // ── selected thumbnails ────────────────────────────────────────────

  private renderSelectedHosts(): void {
    for (const host of this.selectedHosts) this.renderSelectedHost(host)
  }

  private renderSelectedHost(host: HTMLElement): void {
    if (!this.selected.length) {
      host.innerHTML = ''
      return
    }
    host.innerHTML = `<div class="fp-grid">${this.selected.map((m) => this.selectedCardHtml(m)).join('')}</div>`
    for (const cardEl of host.querySelectorAll<HTMLElement>('[data-id]')) {
      const id = cardEl.getAttribute('data-id') ?? ''
      const item = this.selected.find((m) => idStr(m.id) === id)
      if (!item) continue
      cardEl.querySelector('[data-action="remove"]')?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.updateSelected(item, false)
      })
      cardEl.querySelector('[data-action="preview"]')?.addEventListener('click', (e) => {
        e.stopPropagation()
        this.openPreview(item)
      })
    }
  }

  private selectedCardHtml(m: MediaItem): string {
    const ext = esc((m.extension || '').toUpperCase())
    const thumb = isImage(m)
      ? `<img class="fp-card-img" src="${esc(m.src)}" alt="${esc(m.filename)}" loading="lazy" />`
      : `<div class="fp-card-file"><span style="color:${this.fileColor(m.type)}">${icon(this.fileIcon(m.type), 34)}</span></div>`
    return `<div class="fp-card" data-id="${esc(idStr(m.id))}">
      ${thumb}
      <div class="fp-card-actions">
        ${this.previewable(m) ? `<button type="button" class="fp-card-act" data-action="preview" title="${esc(this.L.preview)}" aria-label="${esc(this.L.preview)}">${icon('eye', 15)}</button>` : ''}
        <button type="button" class="fp-card-act" data-action="remove" title="${esc(this.L.remove)}" aria-label="${esc(this.L.remove)}">${icon('close', 15)}</button>
      </div>
      <div class="fp-card-info" dir="auto"><span class="fp-card-name" title="${esc(m.filename)}">${esc(m.filename)}</span></div>
      <div class="fp-card-meta"><span>${ext}</span><span>·</span><span>${formatSize(m.size)}</span></div>
    </div>`
  }

  // ── upload ─────────────────────────────────────────────────────────

  private buildUploadDialog(): void {
    this.uploadOverlay = el('div', {
      class: this.rootClass('fp-overlay fp-overlay--center'),
      hidden: true,
    })
    this.uploadOverlay.append(
      el('div', {
        class: 'fp-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': this.L.uploadTitle,
      }),
    )
    this.disposers.push(
      on(this.uploadOverlay, 'click', (e) => {
        if (e.target === this.uploadOverlay) this.closeUpload()
      }),
    )
  }

  private openUpload(): void {
    // Default the upload destination to the current filter scope. Preserves a
    // real folder id (string or numeric) as well as the 'uncategorized' sentinel;
    // `null` ("all folders") stays null.
    this.uploadFolder = this.filterFolder
    const modal = this.uploadOverlay.querySelector('.fp-modal') as HTMLElement
    clear(modal)
    this.flush(this.modalDisposers)
    this.uploadFolderSelect?.destroy()
    this.modalPrevFocus = (document.activeElement as HTMLElement) ?? null

    const dest = new FolderSelect({
      getFolders: () => this.folders,
      value: this.uploadFolder,
      label: this.L.uploadToFolder,
      labels: this.L,
      includeAll: false,
      manageable: this.o.manageFolders,
      onChange: (v) => (this.uploadFolder = v),
      onCreate: (name) => this.createFolder(name),
      onDelete: (id) => this.deleteFolder(id),
      onRename: (id, name) => this.renameFolder(id, name),
      promptText: (t, m, d) => this.promptText(t, m, d),
      confirm: (t, m) => this.confirm(t, m),
    })
    this.uploadFolderSelect = dest

    const input = el('input', {
      type: 'file',
      multiple: true,
      accept: this.o.accept,
      class: 'fp-file-input',
    })
    const drop = el(
      'div',
      { class: 'fp-drop', tabindex: '0', role: 'button', 'aria-label': this.L.emptyUpload },
      el('span', { class: 'fp-drop-ico', html: icon('upload', 34) }),
      el('div', {}, this.L.dropHint),
    )
    let dragDepth = 0
    this.modalDisposers.push(
      on(drop, 'click', () => input.click()),
      on(drop, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          input.click()
        }
      }),
      on(input, 'change', () => {
        if (!input.files?.length) return
        // Apply the accept filter here too — the native `accept` attribute is
        // only advisory (users can pick "All files"), so mirror the drop path.
        const picked = [...input.files]
        const files = this.acceptFilter(picked)
        const skipped = picked.length - files.length
        if (skipped > 0) this.toast(this.L.uploadSkipped(skipped), 'info')
        if (files.length) void this.doUpload(files)
      }),
      on(drop, 'dragenter', (e) => {
        e.preventDefault()
        dragDepth++
        drop.classList.add('fp-drop--over')
      }),
      on(drop, 'dragover', (e) => e.preventDefault()),
      on(drop, 'dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1)
        if (dragDepth === 0) drop.classList.remove('fp-drop--over')
      }),
      on(drop, 'drop', (e) => {
        e.preventDefault()
        dragDepth = 0
        drop.classList.remove('fp-drop--over')
        const dropped = e.dataTransfer?.files
        if (!dropped?.length) return
        const files = this.acceptFilter([...dropped])
        const skipped = dropped.length - files.length
        if (skipped > 0) this.toast(this.L.uploadSkipped(skipped), 'info')
        if (files.length) void this.doUpload(files)
      }),
    )

    const close = el(
      'button',
      { type: 'button', class: 'fp-icon-btn', title: this.L.close, 'aria-label': this.L.close },
      el('span', { html: icon('close', 20) }),
    )
    this.modalDisposers.push(on(close, 'click', () => this.closeUpload()))

    modal.append(
      el(
        'div',
        { class: 'fp-modal-head' },
        el('span', { class: 'fp-modal-head-ico', html: icon('upload', 22) }),
        el('div', { class: 'fp-modal-title' }, this.L.uploadTitle),
        el('span', { class: 'fp-spacer' }),
        close,
      ),
      el(
        'div',
        { class: 'fp-modal-body' },
        el('label', { class: 'fp-label' }, this.L.destinationFolder),
        dest.el,
        drop,
        input,
      ),
    )
    this.uploadOverlay.hidden = false
    setTimeout(() => drop.focus(), 0)
  }

  private closeUpload(): void {
    this.uploadOverlay.hidden = true
    this.flush(this.modalDisposers)
    this.uploadFolderSelect?.destroy()
    this.uploadFolderSelect = undefined
    this.modalPrevFocus?.focus?.()
    this.modalPrevFocus = null
  }

  private async doUpload(files: File[]): Promise<void> {
    if (this.uploading || !files.length) return
    this.uploading = true
    const drop = this.uploadOverlay.querySelector('.fp-drop')
    drop?.classList.add('fp-drop--busy')
    try {
      const folderId = isFolderId(this.uploadFolder) ? this.uploadFolder : null
      const created = await this.adapter.uploadMedia(files, { folderId })
      this.closeUpload()
      await this.loadFolders()
      this.filterFolder = this.uploadFolder
      this.folderFilter.setValue(this.uploadFolder)
      this.page = 1
      await this.fetchData()
      this.toast(this.L.uploaded(created.length), 'success')
      this.emitter.emit('upload', created)
    } catch (err) {
      this.toast(this.L.uploadFailed, 'error')
      this.emitter.emit('error', err)
    } finally {
      this.uploading = false
      drop?.classList.remove('fp-drop--busy')
    }
  }

  // ── edit ───────────────────────────────────────────────────────────

  private buildEditDialog(): void {
    this.editOverlay = el('div', {
      class: this.rootClass('fp-overlay fp-overlay--center'),
      hidden: true,
    })
    this.editOverlay.append(
      el('div', {
        class: 'fp-modal',
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': this.L.editTitle,
      }),
    )
    this.disposers.push(
      on(this.editOverlay, 'click', (e) => {
        if (e.target === this.editOverlay) this.closeEdit()
      }),
    )
  }

  private openEdit(media: MediaItem): void {
    const form: MediaEditForm = {
      filename: media.filename,
      alt: media.alt,
      tags: [...media.tags],
      folderId: media.folderId,
    }
    const modal = this.editOverlay.querySelector('.fp-modal') as HTMLElement
    clear(modal)
    this.flush(this.modalDisposers)
    this.editFolderSelect?.destroy()
    this.modalPrevFocus = (document.activeElement as HTMLElement) ?? null

    const preview = isImage(media)
      ? el('img', { class: 'fp-edit-preview', src: media.src, alt: media.filename })
      : el(
          'div',
          { class: 'fp-edit-file' },
          el('span', {
            style: `color:${this.fileColor(media.type)}`,
            html: icon(this.fileIcon(media.type), 46),
          }),
          el('small', {}, `${(media.extension || '').toUpperCase()} · ${formatSize(media.size)}`),
        )

    // Ids to associate each visible <label> with its control (fresh per open).
    const filenameId = nextId()
    const altId = nextId()
    const tagsId = nextId()
    const filenameInput = el('input', {
      type: 'text',
      class: 'fp-input',
      id: filenameId,
      value: media.filename,
    })
    const filenameSave = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn',
        title: this.L.saveFilename,
        'aria-label': this.L.saveFilename,
      },
      el('span', { html: icon('check', 18) }),
    )
    this.modalDisposers.push(
      on(filenameSave, 'click', () => {
        const v = filenameInput.value.trim()
        if (v) void this.saveField(media, 'filename', v)
      }),
    )

    const alt = el('input', {
      type: 'text',
      class: 'fp-input',
      id: altId,
      value: media.alt ?? '',
      placeholder: this.L.altPlaceholder,
    })
    const altSave = el(
      'button',
      { type: 'button', class: 'fp-icon-btn', title: this.L.saveAlt, 'aria-label': this.L.saveAlt },
      el('span', { html: icon('check', 18) }),
    )
    this.modalDisposers.push(
      on(altSave, 'click', () => void this.saveField(media, 'alt', alt.value || null)),
    )

    const folder = new FolderSelect({
      getFolders: () => this.folders,
      value: media.folderId ?? 'uncategorized',
      label: this.L.folder,
      labels: this.L,
      includeAll: false,
      manageable: this.o.manageFolders,
      onChange: (v) => {
        form.folderId = isFolderId(v) ? v : null
        void this.saveField(media, 'folderId', form.folderId)
      },
      onCreate: (name) => this.createFolder(name),
      onDelete: (id) => this.deleteFolder(id),
      onRename: (id, name) => this.renameFolder(id, name),
      promptText: (t, m, d) => this.promptText(t, m, d),
      confirm: (t, m) => this.confirm(t, m),
    })
    this.editFolderSelect = folder

    const tagsWrap = el('div', { class: 'fp-tags' })
    const tagInput = el('input', {
      type: 'text',
      class: 'fp-input',
      id: tagsId,
      placeholder: this.L.addTagHint,
    })
    const renderTags = (): void => {
      clear(tagsWrap)
      form.tags.forEach((t, i) => {
        const chip = el(
          'span',
          { class: 'fp-tag' },
          t,
          el('button', { type: 'button', class: 'fp-tag-x', html: icon('close', 12) }),
        )
        chip.querySelector('.fp-tag-x')?.addEventListener('click', () => {
          form.tags.splice(i, 1)
          renderTags()
        })
        tagsWrap.append(chip)
      })
    }
    renderTags()
    this.modalDisposers.push(
      on(tagInput, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const v = tagInput.value.trim()
          if (v && !form.tags.includes(v)) {
            form.tags.push(v)
            renderTags()
          }
          tagInput.value = ''
        }
      }),
    )
    const tagsSave = el(
      'button',
      {
        type: 'button',
        class: 'fp-icon-btn',
        title: this.L.saveTags,
        'aria-label': this.L.saveTags,
      },
      el('span', { html: icon('check', 18) }),
    )
    this.modalDisposers.push(
      on(tagsSave, 'click', () => void this.saveField(media, 'tags', form.tags)),
    )

    const close = el(
      'button',
      { type: 'button', class: 'fp-icon-btn', title: this.L.close, 'aria-label': this.L.close },
      el('span', { html: icon('close', 20) }),
    )
    this.modalDisposers.push(on(close, 'click', () => this.closeEdit()))

    modal.append(
      el(
        'div',
        { class: 'fp-modal-head' },
        el('span', { class: 'fp-modal-head-ico', html: icon('edit', 20) }),
        el('div', { class: 'fp-modal-title' }, this.L.editTitle),
        el('span', { class: 'fp-spacer' }),
        close,
      ),
      el(
        'div',
        { class: 'fp-modal-body' },
        el('div', { class: 'fp-edit-preview-wrap' }, preview),
        el('label', { class: 'fp-label', for: filenameId }, this.L.filename),
        el('div', { class: 'fp-row' }, filenameInput, filenameSave),
        el('label', { class: 'fp-label', for: altId }, this.L.altText),
        el('div', { class: 'fp-row' }, alt, altSave),
        el('label', { class: 'fp-label' }, this.L.folder),
        folder.el,
        el('label', { class: 'fp-label', for: tagsId }, this.L.tags),
        tagsWrap,
        el('div', { class: 'fp-row' }, tagInput, tagsSave),
        el(
          'div',
          { class: 'fp-edit-meta' },
          this.L.editMeta(media.type, media.mimeType, formatSize(media.size)),
        ),
      ),
    )
    this.editOverlay.hidden = false
    setTimeout(() => alt.focus(), 0)
  }

  private closeEdit(): void {
    this.editOverlay.hidden = true
    this.flush(this.modalDisposers)
    this.editFolderSelect?.destroy()
    this.editFolderSelect = undefined
    this.modalPrevFocus?.focus?.()
    this.modalPrevFocus = null
  }

  private async saveField(
    media: MediaItem,
    field: keyof MediaEditForm,
    value: MediaEditForm[keyof MediaEditForm],
  ): Promise<void> {
    try {
      const patch = { [field]: value } as Partial<MediaEditForm>
      const updated = await this.adapter.updateMedia(media.id, patch)
      const idx = this.media.findIndex((m) => idStr(m.id) === idStr(media.id))
      if (idx !== -1) this.media[idx] = updated
      const sidx = this.selected.findIndex((m) => idStr(m.id) === idStr(media.id))
      if (sidx !== -1) this.selected[sidx] = updated
      this.renderGrid()
      this.renderSelectedHosts()
      this.toast(this.L.saved, 'success')
    } catch (err) {
      this.toast(this.L.saveFailed, 'error')
      this.emitter.emit('error', err)
    }
  }

  // ── preview ────────────────────────────────────────────────────────

  private buildPreview(): void {
    this.previewBody = el('div', { class: 'fp-preview-body' })
    const close = el('button', {
      type: 'button',
      class: 'fp-preview-close',
      'aria-label': this.L.closePreview,
      html: icon('close', 24),
    })
    this.previewOverlay = el(
      'div',
      {
        class: this.rootClass('fp-overlay fp-preview'),
        hidden: true,
        role: 'dialog',
        'aria-modal': 'true',
        'aria-label': this.L.preview,
      },
      close,
      this.previewBody,
    )
    this.disposers.push(
      on(close, 'click', () => this.closePreview()),
      on(this.previewOverlay, 'click', (e) => {
        if (e.target === this.previewOverlay) this.closePreview()
      }),
    )
  }

  private openPreview(item: MediaItem): void {
    this.modalPrevFocus = (document.activeElement as HTMLElement) ?? null
    // Name the dialog after the item so AT announces what opened.
    this.previewOverlay.setAttribute('aria-label', `${this.L.preview}: ${item.filename}`)
    clear(this.previewBody)
    let node: HTMLElement
    if (item.type === 'video') {
      node = el('video', {
        class: 'fp-preview-media',
        src: item.src,
        controls: true,
        autoplay: true,
      })
    } else if (item.type === 'audio') {
      // No autoplay for audio — auto-playing sound is disruptive, especially
      // for screen-reader users; the controls let them start it.
      node = el('audio', {
        class: 'fp-preview-media fp-preview-audio',
        src: item.src,
        controls: true,
      })
    } else {
      node = el('img', { class: 'fp-preview-img', src: item.src, alt: item.alt ?? item.filename })
    }
    this.previewBody.append(node)
    this.previewOverlay.hidden = false
    this.previewOverlay.querySelector<HTMLButtonElement>('.fp-preview-close')?.focus()
  }

  private closePreview(): void {
    this.previewOverlay.hidden = true
    clear(this.previewBody) // detaches <video>/<audio> and stops playback
    this.modalPrevFocus?.focus?.()
    this.modalPrevFocus = null
  }

  // ── folder ops ─────────────────────────────────────────────────────

  private async createFolder(name: string): Promise<MediaFolder | null> {
    try {
      const folder = await this.adapter.createFolder(name)
      await this.loadFolders()
      return folder
    } catch (err) {
      this.toast(this.L.createFolderFailed, 'error')
      this.emitter.emit('error', err)
      return null
    }
  }

  private async renameFolder(id: MediaId, name: string): Promise<MediaFolder | null> {
    try {
      const folder = await this.adapter.renameFolder(id, name)
      await this.loadFolders()
      return folder
    } catch (err) {
      this.toast(this.L.renameFolderFailed, 'error')
      this.emitter.emit('error', err)
      return null
    }
  }

  private async deleteFolder(id: MediaId): Promise<void> {
    try {
      await this.adapter.deleteFolder(id)
      await this.loadFolders()
      if (idStr(this.filterFolder) === idStr(id)) {
        this.filterFolder = null
        void this.fetchData()
      }
    } catch (err) {
      this.toast(this.L.deleteFolderFailed, 'error')
      this.emitter.emit('error', err)
    }
  }

  private async deleteMedia(item: MediaItem): Promise<void> {
    const ok = await this.confirm(this.L.deleteFileTitle, this.L.deleteFileConfirm(item.filename))
    if (!ok) return
    try {
      await this.adapter.deleteMedia(item.id)
      this.updateSelected(item, false)
      this.media = this.media.filter((m) => idStr(m.id) !== idStr(item.id))
      // Keep the pager in sync with the removed item.
      this.total = Math.max(0, this.total - 1)
      this.lastPage = Math.max(1, Math.ceil(this.total / this.o.perPage))
      if (!this.media.length && this.page > 1) {
        // Deleted the last row on a later page — step back and refetch.
        this.page = Math.min(this.page, this.lastPage)
        void this.fetchData()
      } else {
        this.renderGrid()
        this.renderPager()
      }
      this.toast(this.L.fileDeleted, 'success')
      this.emitter.emit('delete', item)
    } catch (err) {
      this.toast(this.L.deleteFailed, 'error')
      this.emitter.emit('error', err)
    }
  }

  // ── prompt / confirm ───────────────────────────────────────────────

  private promptText(title: string, message: string, def = ''): Promise<string | null> {
    return new Promise((resolve) => {
      const input = el('input', { type: 'text', class: 'fp-input', value: def })
      const modal = this.miniModal(title, message, input, [
        { label: this.L.cancel, variant: 'ghost', onClick: () => resolve(null) },
        {
          label: this.L.ok,
          variant: 'primary',
          onClick: () => resolve(input.value.trim() || null),
        },
      ])
      setTimeout(() => input.focus(), 0)
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') modal.querySelector<HTMLButtonElement>('.fp-btn--primary')?.click()
      })
    })
  }

  private confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.miniModal(title, message, null, [
        { label: this.L.cancel, variant: 'ghost', onClick: () => resolve(false) },
        { label: this.L.confirm, variant: 'danger', onClick: () => resolve(true) },
      ])
    })
  }

  private miniModal(
    title: string,
    message: string,
    control: HTMLElement | null,
    buttons: { label: string; variant: 'primary' | 'ghost' | 'danger'; onClick: () => void }[],
  ): HTMLElement {
    const overlay = el('div', { class: this.rootClass('fp-overlay fp-overlay--center fp-mini') })
    this.applyThemeTo(overlay)
    const prevFocus = (document.activeElement as HTMLElement) ?? null
    const dismiss = (): void => {
      overlay.remove()
      const i = this.miniStack.indexOf(overlay)
      if (i >= 0) this.miniStack.splice(i, 1)
      this.miniCancel.delete(overlay)
      prevFocus?.focus?.()
    }
    const footer = el('div', { class: 'fp-mini-foot' })
    let cancelClick: (() => void) | undefined
    for (const b of buttons) {
      const btn = el('button', { type: 'button', class: `fp-btn fp-btn--${b.variant}` }, b.label)
      btn.addEventListener('click', () => {
        b.onClick()
        dismiss()
      })
      if (b.variant === 'ghost') cancelClick = b.onClick
      footer.append(btn)
    }
    const cancel = (): void => {
      ;(cancelClick ?? buttons[0]?.onClick)?.()
      dismiss()
    }
    this.miniCancel.set(overlay, cancel)
    const titleId = nextId()
    const modal = el(
      'div',
      { class: 'fp-mini-modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      el('div', { class: 'fp-mini-title', id: titleId }, title),
      el('div', { class: 'fp-mini-msg' }, message),
      control,
      footer,
    )
    overlay.append(modal)
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cancel()
    })
    this.modalHost.append(overlay)
    this.miniStack.push(overlay)
    setTimeout(() => {
      const focusTarget =
        control ??
        modal.querySelector<HTMLButtonElement>('.fp-btn--primary, .fp-btn--danger') ??
        modal.querySelector<HTMLButtonElement>('.fp-btn')
      focusTarget?.focus?.()
    }, 0)
    return modal
  }

  // ── misc ───────────────────────────────────────────────────────────

  private onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Tab') {
      const layer = this.topLayer()
      if (layer) this.trapTab(layer, e)
      return
    }
    if (e.key !== 'Escape') return
    // Close only the topmost layer, in stacking order.
    if (this.miniStack.length) {
      const top = this.miniStack[this.miniStack.length - 1]
      if (top) this.miniCancel.get(top)?.()
      return
    }
    if (!this.previewOverlay.hidden) return this.closePreview()
    if (!this.editOverlay.hidden) return this.closeEdit()
    if (!this.uploadOverlay.hidden) return this.closeUpload()
    if (this.dialogCard.classList.contains('fp-dialog--filters')) {
      this.setFiltersOpen(false)
      return
    }
    if (this.opened) this.close()
  }

  /** The topmost visible overlay (mini-modal ▸ preview ▸ edit ▸ upload ▸ main). */
  private topLayer(): HTMLElement | null {
    if (this.miniStack.length) return this.miniStack[this.miniStack.length - 1] ?? null
    if (!this.previewOverlay.hidden) return this.previewOverlay
    if (!this.editOverlay.hidden) return this.editOverlay
    if (!this.uploadOverlay.hidden) return this.uploadOverlay
    if (this.opened) return this.overlay
    return null
  }

  private focusables(container: HTMLElement): HTMLElement[] {
    const sel =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
    return [...container.querySelectorAll<HTMLElement>(sel)].filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    )
  }

  /** Keep Tab focus inside the given overlay (a lightweight focus trap). */
  private trapTab(container: HTMLElement, e: KeyboardEvent): void {
    const items = this.focusables(container)
    if (!items.length) {
      e.preventDefault()
      container.focus()
      return
    }
    const first = items[0]
    const last = items[items.length - 1]
    const activeEl = document.activeElement
    if (e.shiftKey) {
      if (activeEl === first || !container.contains(activeEl)) {
        e.preventDefault()
        last?.focus()
      }
    } else if (activeEl === last || !container.contains(activeEl)) {
      e.preventDefault()
      first?.focus()
    }
  }
}
