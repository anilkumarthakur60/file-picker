import { append, clear, el, on } from './dom'
import { icon } from './icons'
import type { FilePickerLabels, FolderScope, MediaFolder, MediaId } from './types'
import { isFolderId } from './utils'

let fsUid = 0

export interface FolderSelectOptions {
  /** Current folder list (read lazily so it stays fresh). */
  getFolders: () => MediaFolder[]
  /** Initial value. */
  value?: FolderScope
  /** Show the "All Folders" option. @default true */
  includeAll?: boolean
  /** Show the "Uncategorized" option. @default true */
  includeUncategorized?: boolean
  /** Show create/delete controls. @default true */
  manageable?: boolean
  /** Placeholder / label. @default 'Folder' */
  label?: string
  onChange: (value: FolderScope) => void
  onCreate?: (name: string) => Promise<MediaFolder | null>
  onDelete?: (id: MediaId) => Promise<void>
  onRename?: (id: MediaId, name: string) => Promise<MediaFolder | null>
  /** Prompt/confirm dialogs supplied by the host picker. */
  promptText: (title: string, message: string, def?: string) => Promise<string | null>
  confirm: (title: string, message: string) => Promise<boolean>
  /** User-facing strings (falls back to English when omitted). */
  labels?: FilePickerLabels
}

interface Option {
  label: string
  value: FolderScope
  icon: string
  color: string
  count?: number
}

/** A searchable folder dropdown with optional create/rename/delete. */
export class FolderSelect {
  readonly el: HTMLElement
  private readonly trigger: HTMLButtonElement
  private readonly panel: HTMLElement
  private readonly labelSpan: HTMLElement
  private readonly search: HTMLInputElement
  private readonly list: HTMLElement
  private readonly listId = `fp-fs-list-${++fsUid}`
  /** The current option buttons, in DOM order  used for arrow-key navigation. */
  private optionButtons: HTMLButtonElement[] = []
  private value: FolderScope
  private open = false
  private readonly disposers: (() => void)[] = []

  constructor(private readonly opts: FolderSelectOptions) {
    this.value = opts.value ?? null
    this.labelSpan = el('span', { class: 'fp-fs-label' })
    this.trigger = el(
      'button',
      {
        type: 'button',
        class: 'fp-fs-trigger',
        'aria-haspopup': 'listbox',
        'aria-expanded': 'false',
        'aria-controls': this.listId,
      },
      el('span', { class: 'fp-fs-ico', html: icon('folder', 18) }),
      this.labelSpan,
      el('span', { class: 'fp-fs-caret', html: icon('chevronRight', 16) }),
    )
    const searchLabel = opts.labels?.folderSearch ?? 'Search or create…'
    this.search = el('input', {
      type: 'text',
      class: 'fp-fs-search',
      placeholder: searchLabel,
      'aria-label': searchLabel,
    })
    this.list = el('div', {
      class: 'fp-fs-list',
      role: 'listbox',
      id: this.listId,
      'aria-label': opts.label ?? opts.labels?.folderLabel ?? 'Folder',
    })
    this.panel = el(
      'div',
      { class: 'fp-fs-panel', hidden: true },
      el('div', { class: 'fp-fs-search-wrap' }, this.search),
      this.list,
    )
    this.el = el('div', { class: 'fp-fs' }, this.trigger, this.panel)

    this.disposers.push(
      on(this.trigger, 'click', (e) => {
        e.stopPropagation()
        this.toggle()
      }),
      on(this.search, 'input', () => this.renderList()),
      on(this.search, 'keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          void this.createFromSearch()
        } else if (e.key === 'Escape') {
          this.setOpen(false)
          this.trigger.focus()
        } else if (e.key === 'ArrowDown') {
          e.preventDefault()
          this.focusOption(0)
        }
      }),
      on(this.list, 'keydown', (e) => this.onListKeydown(e)),
      on(document, 'click', (e) => {
        if (this.open && !this.el.contains(e.target as Node)) this.setOpen(false)
      }),
    )
    this.renderLabel()
  }

  getValue(): FolderScope {
    return this.value
  }

  setValue(value: FolderScope, silent = true): void {
    this.value = value
    this.renderLabel()
    if (!silent) this.opts.onChange(value)
  }

  /** Re-read folders and re-render (call after the folder list changes). */
  refresh(): void {
    if (this.open) this.renderList()
    this.renderLabel()
  }

  private options(): Option[] {
    const list: Option[] = []
    if (this.opts.includeAll !== false) {
      list.push({
        label: this.opts.labels?.allFolders ?? 'All Folders',
        value: null,
        icon: 'folders',
        color: '#78909c',
      })
    }
    if (this.opts.includeUncategorized !== false) {
      list.push({
        label: this.opts.labels?.uncategorized ?? 'Uncategorized',
        value: 'uncategorized',
        icon: 'folderOff',
        color: '#90a4ae',
      })
    }
    for (const f of this.opts.getFolders()) {
      list.push({
        label: f.name,
        value: f.id,
        icon: 'folder',
        color: '#e0a83a',
        ...(f.mediaCount != null ? { count: f.mediaCount } : {}),
      })
    }
    return list
  }

  private currentLabel(): string {
    const opt = this.options().find((o) => String(o.value) === String(this.value))
    return opt?.label ?? this.opts.label ?? this.opts.labels?.folderLabel ?? 'Folder'
  }

  private renderLabel(): void {
    this.labelSpan.textContent = this.currentLabel()
  }

  private toggle(): void {
    this.setOpen(!this.open)
  }

  private setOpen(open: boolean): void {
    this.open = open
    this.panel.hidden = !open
    this.el.classList.toggle('fp-fs--open', open)
    this.trigger.setAttribute('aria-expanded', String(open))
    if (open) {
      this.search.value = ''
      this.renderList()
      this.search.focus()
    }
  }

  /** Move focus to the option at `index` (clamped to the current list). */
  private focusOption(index: number): void {
    if (!this.optionButtons.length) return
    const i = Math.max(0, Math.min(index, this.optionButtons.length - 1))
    this.optionButtons[i]?.focus()
  }

  /** Arrow/Home/End/Escape navigation across the option buttons. */
  private onListKeydown(e: KeyboardEvent): void {
    const btns = this.optionButtons
    if (!btns.length) return
    const current = btns.indexOf(document.activeElement as HTMLButtonElement)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      this.focusOption(current < 0 ? 0 : current + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (current <= 0) this.search.focus()
      else this.focusOption(current - 1)
    } else if (e.key === 'Home') {
      e.preventDefault()
      this.focusOption(0)
    } else if (e.key === 'End') {
      e.preventDefault()
      this.focusOption(btns.length - 1)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      this.setOpen(false)
      this.trigger.focus()
    }
  }

  private select(opt: Option): void {
    this.value = opt.value
    this.renderLabel()
    this.setOpen(false)
    this.trigger.focus()
    this.opts.onChange(opt.value)
  }

  private renderList(): void {
    clear(this.list)
    this.optionButtons = []
    const needle = this.search.value.trim().toLowerCase()
    const opts = this.options().filter((o) => !needle || o.label.toLowerCase().includes(needle))
    const manageable = this.opts.manageable !== false

    for (const opt of opts) {
      const selected = String(opt.value) === String(this.value)
      const optBtn = el('button', {
        type: 'button',
        class: `fp-fs-opt${selected ? ' fp-fs-opt--active' : ''}`,
        role: 'option',
        'aria-selected': String(selected),
        // Roving: options are reached with the arrow keys, not Tab.
        tabindex: '-1',
      })
      append(
        optBtn,
        el('span', {
          class: 'fp-fs-opt-ico',
          style: `color:${opt.color}`,
          html: icon(opt.icon, 18),
        }),
        el('span', { class: 'fp-fs-opt-label' }, opt.label),
      )
      if (opt.count != null) {
        append(optBtn, el('span', { class: 'fp-fs-badge' }, String(opt.count)))
      }
      this.disposers.push(on(optBtn, 'click', () => this.select(opt)))
      this.optionButtons.push(optBtn)

      // Wrap the option + its manage buttons in a presentational row so the
      // manage buttons are focusable SIBLINGS of the option, never interactive
      // descendants of a role="option" (which is invalid and unreachable by AT).
      const row = el('div', { class: 'fp-fs-row', role: 'presentation' }, optBtn)

      if (manageable && isFolderId(opt.value)) {
        if (this.opts.onRename) {
          const renameLabel = this.opts.labels?.renameFolderControl ?? 'Rename folder'
          const ren = el('button', {
            type: 'button',
            class: 'fp-fs-ren',
            title: renameLabel,
            'aria-label': `${renameLabel}: ${opt.label}`,
            html: icon('edit', 14),
          })
          this.disposers.push(
            on(ren, 'click', (e) => {
              e.stopPropagation()
              void this.renameFolder(opt)
            }),
          )
          append(row, ren)
        }
        const deleteLabel = this.opts.labels?.deleteFolderControl ?? 'Delete folder'
        const del = el('button', {
          type: 'button',
          class: 'fp-fs-del',
          title: deleteLabel,
          'aria-label': `${deleteLabel}: ${opt.label}`,
          html: icon('trash', 15),
        })
        this.disposers.push(
          on(del, 'click', (e) => {
            e.stopPropagation()
            void this.deleteFolder(opt)
          }),
        )
        append(row, del)
      }
      append(this.list, row)
    }

    // No-match / create row
    if (manageable && needle && !opts.some((o) => o.label.toLowerCase() === needle)) {
      const create = el(
        'button',
        { type: 'button', class: 'fp-fs-create' },
        el('span', { class: 'fp-fs-opt-ico', html: icon('folderPlus', 18) }),
        el(
          'span',
          {},
          this.opts.labels?.createFolder(this.search.value.trim()) ??
            `Create folder "${this.search.value.trim()}"`,
        ),
      )
      this.disposers.push(on(create, 'click', () => void this.createFromSearch()))
      append(this.list, create)
    } else if (!opts.length) {
      append(
        this.list,
        el('div', { class: 'fp-fs-empty' }, this.opts.labels?.noFolders ?? 'No folders found'),
      )
    }
  }

  private async createFromSearch(): Promise<void> {
    const name = this.search.value.trim()
    if (!name || !this.opts.onCreate) return
    const folder = await this.opts.onCreate(name)
    if (folder) {
      this.value = folder.id
      this.renderLabel()
      this.setOpen(false)
      this.opts.onChange(folder.id)
    }
  }

  private async renameFolder(opt: Option): Promise<void> {
    if (!this.opts.onRename || !isFolderId(opt.value)) return
    const name = await this.opts.promptText(
      this.opts.labels?.renameFolderTitle ?? 'Rename folder',
      this.opts.labels?.renameFolderMessage ?? 'New folder name',
      opt.label,
    )
    if (!name || name === opt.label) return
    await this.opts.onRename(opt.value, name)
    if (String(this.value) === String(opt.value)) this.renderLabel()
    this.renderList()
  }

  private async deleteFolder(opt: Option): Promise<void> {
    if (!this.opts.onDelete || !isFolderId(opt.value)) return
    const ok = await this.opts.confirm(
      this.opts.labels?.deleteFolderTitle ?? 'Delete folder',
      this.opts.labels?.deleteFolderConfirm(opt.label) ??
        `Delete "${opt.label}"? Files inside move to Uncategorized.`,
    )
    if (!ok) return
    await this.opts.onDelete(opt.value)
    if (String(this.value) === String(opt.value)) {
      this.value = null
      this.renderLabel()
      this.opts.onChange(null)
    }
    this.renderList()
  }

  destroy(): void {
    for (const d of this.disposers) d()
    this.disposers.length = 0
    this.el.remove()
  }
}
