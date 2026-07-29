import { describe, it, expect, beforeEach } from 'vitest'
import { FilePicker, createMemoryAdapter } from '../src'
import type { FilePickerAdapter, MediaItem, MediaPage } from '../src'

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 5))

// Click a card's checkbox. Cards are rebuilt by renderGrid after every
// selection change, so re-query on each call.
const checkCard = (i: number): void =>
  document
    .querySelectorAll<HTMLElement>('.fp-card')
    [i]?.querySelector<HTMLElement>('.fp-card-check')
    ?.click()

const media = (id: number): MediaItem => ({
  id,
  folderId: null,
  filename: `f${id}.png`,
  extension: 'png',
  mimeType: 'image/png',
  type: 'image',
  alt: null,
  size: 1000,
  src: '',
  tags: [],
})

describe('FilePicker', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.overflow = ''
  })

  it('opens, tracks selection, closes and cleans up', () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    const fp = new FilePicker({ adapter, multiple: true })
    expect(fp.isOpen).toBe(false)

    let opened = 0
    let closed = 0
    fp.on('open', () => (opened += 1))
    fp.on('close', () => (closed += 1))

    fp.open()
    expect(fp.isOpen).toBe(true)
    expect(opened).toBe(1)

    fp.setSelected([media(1)])
    expect(fp.getSelected()).toHaveLength(1)
    expect(fp.getSelected()[0]?.id).toBe(1)

    fp.close()
    expect(fp.isOpen).toBe(false)
    expect(closed).toBe(1)

    expect(document.querySelectorAll('.fp-overlay').length).toBeGreaterThan(0)
    fp.destroy()
    expect(document.querySelectorAll('.fp-overlay').length).toBe(0)
  })

  it('mountTrigger renders a button that opens the picker', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter })
    const host = document.createElement('div')
    document.body.append(host)
    const dispose = fp.mountTrigger(host, { label: 'Pick' })
    const btn = host.querySelector('button')
    expect(btn?.textContent).toContain('Pick')
    btn?.click()
    expect(fp.isOpen).toBe(true)
    dispose()
    expect(host.querySelector('button')).toBeNull()
    fp.destroy()
  })

  it('single-select replaces the previous selection', () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    const fp = new FilePicker({ adapter, multiple: false })
    fp.setSelected(media(1))
    expect(fp.getSelected()).toHaveLength(1)
    fp.setSelected(media(2))
    expect(fp.getSelected()).toHaveLength(1)
    expect(fp.getSelected()[0]?.id).toBe(2)
    fp.destroy()
  })

  it('setTheme switches the theme at runtime and emits', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter, theme: 'dark' })
    const overlay = document.querySelector('.fp-overlay')
    expect(overlay?.classList.contains('fp--dark')).toBe(true)
    let emitted: string | null = null
    fp.on('theme', (t) => (emitted = t))
    fp.setTheme('light')
    expect(overlay?.classList.contains('fp--dark')).toBe(false)
    expect(overlay?.classList.contains('fp--light')).toBe(true)
    expect(emitted).toBe('light')
    fp.destroy()
  })

  it('the filters toggle opens the off-canvas drawer', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter })
    const toggle = document.querySelector('.fp-filters-toggle')
    const card = document.querySelector('.fp-dialog')
    const filters = document.querySelector('.fp-filters')
    expect(toggle).not.toBeNull()
    // The drawer must be a direct child of the dialog, not nested in the
    // sticky header — otherwise its z-index is trapped and it opens *behind*
    // the backdrop.
    expect(filters?.parentElement).toBe(card)
    expect(card?.classList.contains('fp-dialog--filters')).toBe(false)
    ;(toggle as HTMLButtonElement).click()
    expect(card?.classList.contains('fp-dialog--filters')).toBe(true)
    fp.destroy()
  })

  it('renders no built-in theme toggle; the host drives the theme', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter, theme: 'dark' })
    // No theme-toggle control in the toolbar…
    const actions = document.querySelector('.fp-toolbar-actions')
    const labels = [...(actions?.querySelectorAll('button') ?? [])].map((b) =>
      b.getAttribute('aria-label'),
    )
    expect(labels).not.toContain('Toggle light or dark theme')
    // …but the theme is applied and remains host-drivable via setTheme().
    const overlay = document.querySelector('.fp-overlay')
    expect(overlay?.classList.contains('fp--dark')).toBe(true)
    fp.setTheme('light')
    expect(overlay?.classList.contains('fp--light')).toBe(true)
    fp.destroy()
  })

  it('the dialog is a labelled modal', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter })
    const dialog = document.querySelector('.fp-dialog')
    expect(dialog?.getAttribute('role')).toBe('dialog')
    expect(dialog?.getAttribute('aria-modal')).toBe('true')
    const labelledby = dialog?.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    expect(document.getElementById(labelledby ?? '')?.textContent).toBe('Media Library')
    fp.destroy()
  })

  it('the grid is a keyboard-operable listbox', async () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2), media(3)], latency: 0 })
    const fp = new FilePicker({ adapter, multiple: true })
    fp.open()
    await new Promise((r) => setTimeout(r, 5))
    const grid = document.querySelector('.fp-grid')
    expect(grid?.getAttribute('role')).toBe('listbox')
    const cards = document.querySelectorAll<HTMLElement>('.fp-card')
    expect(cards).toHaveLength(3)
    expect(cards[0]?.getAttribute('role')).toBe('option')
    // roving tabindex: only the active card is tabbable
    expect(cards[0]?.getAttribute('tabindex')).toBe('0')
    expect(cards[1]?.getAttribute('tabindex')).toBe('-1')
    // Enter on a focused card selects it
    cards[0]?.focus()
    cards[0]?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    expect(fp.getSelected().map((m) => m.id)).toContain(1)
    fp.destroy()
  })

  it('Escape closes the filters drawer before the dialog', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter })
    fp.open()
    const card = document.querySelector('.fp-dialog')
    ;(document.querySelector('.fp-filters-toggle') as HTMLButtonElement).click()
    expect(card?.classList.contains('fp-dialog--filters')).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(card?.classList.contains('fp-dialog--filters')).toBe(false)
    expect(fp.isOpen).toBe(true)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(fp.isOpen).toBe(false)
    fp.destroy()
  })

  it('shows an error state with a working Retry when loading fails', async () => {
    const base = createMemoryAdapter({ media: [media(1)], latency: 0 })
    let fail = true
    const adapter: FilePickerAdapter = {
      ...base,
      listMedia: (q) => (fail ? Promise.reject(new Error('boom')) : base.listMedia(q)),
    }
    const fp = new FilePicker({ adapter })
    fp.on('error', () => {})
    fp.open()
    await tick()
    expect(document.querySelector('[data-action="retry"]')).not.toBeNull()
    expect(document.querySelector('.fp-card')).toBeNull()
    fail = false
    ;(document.querySelector('[data-action="retry"]') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelector('.fp-card')).not.toBeNull()
    fp.destroy()
  })

  it('an empty library shows an Upload call-to-action', async () => {
    const adapter = createMemoryAdapter({ media: [], latency: 0 })
    const fp = new FilePicker({ adapter })
    fp.open()
    await tick()
    expect(document.querySelector('[data-action="upload-empty"]')).not.toBeNull()
    fp.destroy()
  })

  it('shows a toast after a successful delete', async () => {
    const adapter = createMemoryAdapter({ media: [media(1)], latency: 0 })
    const fp = new FilePicker({ adapter })
    fp.open()
    await tick()
    ;(document.querySelector('[data-action="delete"]') as HTMLButtonElement).click()
    ;(document.querySelector('.fp-mini .fp-btn--danger') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelector('.fp-toast')).not.toBeNull()
    fp.destroy()
  })

  it('single-select with closeOnSelect confirms and closes on click', async () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    const fp = new FilePicker({ adapter })
    let confirmed: MediaItem[] | null = null
    fp.on('select', (items) => (confirmed = items))
    fp.open()
    await tick()
    ;(document.querySelector('.fp-card') as HTMLElement).click()
    expect(confirmed).not.toBeNull()
    expect(fp.isOpen).toBe(false)
    fp.destroy()
  })

  it('the card body and its checkbox both toggle selection', async () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    const fp = new FilePicker({ adapter, multiple: true })
    fp.open()
    await tick()

    // The whole card is a hit target: thumbnail, filename or the card itself.
    document.querySelector<HTMLElement>('.fp-card .fp-card-img, .fp-card .fp-card-file')?.click()
    expect(fp.getSelected().map((m) => m.id)).toEqual([1])
    document.querySelector<HTMLElement>('.fp-card .fp-card-name')?.click()
    expect(fp.getSelected()).toHaveLength(0)

    // …and so is the checkbox, which is what shows the state.
    checkCard(0)
    expect(fp.getSelected().map((m) => m.id)).toEqual([1])
    checkCard(0)
    expect(fp.getSelected()).toHaveLength(0)
    fp.destroy()
  })

  it('maxSelection caps a multi-select', async () => {
    const adapter = createMemoryAdapter({ media: [media(1), media(2), media(3)], latency: 0 })
    const fp = new FilePicker({ adapter, multiple: true, maxSelection: 2 })
    fp.open()
    await tick()
    checkCard(0)
    checkCard(1)
    checkCard(2)
    expect(fp.getSelected()).toHaveLength(2)
    fp.destroy()
  })

  it('labels override user-facing strings (i18n)', () => {
    const adapter = createMemoryAdapter({ latency: 0 })
    const fp = new FilePicker({ adapter, labels: { filters: 'Filtres', upload: 'Téléverser' } })
    expect(document.querySelector('.fp-filters-toggle')?.getAttribute('aria-label')).toBe('Filtres')
    expect(document.querySelector('.fp-up')?.getAttribute('aria-label')).toBe('Téléverser')
    fp.destroy()
  })

  it('fileColors override the per-type accent color', async () => {
    const adapter = createMemoryAdapter({
      media: [{ ...media(1), type: 'video', mimeType: 'video/mp4', extension: 'mp4' }],
      latency: 0,
    })
    const fp = new FilePicker({ adapter, fileColors: { video: '#abcdef' } })
    fp.open()
    await tick()
    expect(document.querySelector('.fp-grid')?.innerHTML).toContain('#abcdef')
    fp.destroy()
  })

  it('destroy() tears down trigger and selected hosts the caller never disposed', () => {
    const adapter = createMemoryAdapter({ media: [media(1)], latency: 0 })
    const fp = new FilePicker({ adapter })
    const host = document.createElement('div')
    document.body.append(host)
    // Intentionally discard the returned disposers — destroy() must still clean up.
    fp.mountTrigger(host)
    fp.mountSelected(host)
    expect(host.querySelector('.fp-trigger')).not.toBeNull()
    expect(host.querySelector('.fp-selected')).not.toBeNull()
    fp.destroy()
    expect(host.querySelector('.fp-trigger')).toBeNull()
    expect(host.querySelector('.fp-selected')).toBeNull()
  })

  it('a failed background refetch keeps existing content and shows a toast', async () => {
    const base = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    let fail = false
    const adapter: FilePickerAdapter = {
      ...base,
      listMedia: (q) => (fail ? Promise.reject(new Error('boom')) : base.listMedia(q)),
    }
    const fp = new FilePicker({ adapter, searchDebounce: 0 })
    fp.on('error', () => {})
    fp.open()
    await tick()
    expect(document.querySelectorAll('.fp-card')).toHaveLength(2)

    fail = true
    const search = document.querySelector<HTMLInputElement>('.fp-input[type="search"]')
    if (search) {
      search.value = 'zzz'
      search.dispatchEvent(new Event('input'))
    }
    await tick()
    await tick()

    // Content is preserved (not wiped to the full-page error state) and the
    // failure surfaces as a toast instead.
    expect(document.querySelectorAll('.fp-card')).toHaveLength(2)
    expect(document.querySelector('[data-action="retry"]')).toBeNull()
    expect(document.querySelector('.fp-toast')).not.toBeNull()
    fp.destroy()
  })

  it('a stale in-flight fetch does not clobber a newer one', async () => {
    const base = createMemoryAdapter({ latency: 0 })
    const pending: { search: string | null | undefined; resolve: (v: MediaPage) => void }[] = []
    const adapter: FilePickerAdapter = {
      ...base,
      listMedia: (q) =>
        new Promise<MediaPage>((resolve) => pending.push({ search: q.search, resolve })),
    }
    const fp = new FilePicker({ adapter, searchDebounce: 0 })
    fp.on('error', () => {})
    fp.open()
    const search = document.querySelector<HTMLInputElement>('.fp-input[type="search"]')
    if (search) {
      search.value = 'q'
      search.dispatchEvent(new Event('input'))
    }
    await tick()

    const newer = pending.find((p) => p.search === 'q')
    const older = pending.find((p) => !p.search)
    expect(newer).toBeTruthy()
    expect(older).toBeTruthy()
    // Newer resolves first…
    newer?.resolve({ items: [media(2), media(3)], total: 2, lastPage: 1 })
    await tick()
    // …then the stale older request resolves late and must be ignored.
    older?.resolve({ items: [media(1)], total: 1, lastPage: 1 })
    await tick()

    const ids = [...document.querySelectorAll('.fp-card')].map((c) => c.getAttribute('data-id'))
    expect(ids).toEqual(['2', '3'])
    fp.destroy()
  })

  it('deleting an item keeps the pager total in sync', async () => {
    const adapter = createMemoryAdapter({
      media: Array.from({ length: 25 }, (_, i) => media(i + 1)),
      latency: 0,
    })
    const fp = new FilePicker({ adapter, perPage: 12 })
    fp.on('error', () => {})
    fp.open()
    await tick()
    expect(document.querySelector('.fp-page-label')?.textContent).toContain('25')
    ;(document.querySelector('[data-action="delete"]') as HTMLButtonElement).click()
    ;(document.querySelector('.fp-mini .fp-btn--danger') as HTMLButtonElement).click()
    await tick()
    expect(document.querySelector('.fp-page-label')?.textContent).toContain('24')
    fp.destroy()
  })
})
