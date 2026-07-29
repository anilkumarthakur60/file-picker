import { describe, it, expect, beforeEach } from 'vitest'
import { FolderSelect } from '../src/folder-select'
import type { FolderSelectOptions } from '../src/folder-select'
import type { MediaFolder } from '../src'

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0))

const make = (over: Partial<FolderSelectOptions> = {}): FolderSelect => {
  const fs = new FolderSelect({
    getFolders: (): MediaFolder[] => [
      { id: 5, name: 'Photos' },
      { id: 'uuid-1', name: 'Docs' },
    ],
    value: null,
    manageable: true,
    onChange: () => {},
    onRename: async () => null,
    onDelete: async () => {},
    onCreate: async (name) => ({ id: 99, name }),
    promptText: async () => null,
    confirm: async () => false,
    ...over,
  })
  document.body.append(fs.el)
  return fs
}

const openPanel = (fs: FolderSelect): void =>
  (fs.el.querySelector('.fp-fs-trigger') as HTMLButtonElement).click()

describe('FolderSelect', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders all / uncategorized / folder options and marks the active one', () => {
    const fs = make({ value: 5 })
    openPanel(fs)
    const opts = fs.el.querySelectorAll('.fp-fs-opt')
    // All Folders + Uncategorized + 2 folders
    expect(opts).toHaveLength(4)
    const active = fs.el.querySelector('.fp-fs-opt--active')
    expect(active?.textContent).toContain('Photos')
    expect(active?.getAttribute('aria-selected')).toBe('true')
  })

  it('exposes rename/delete as real buttons for BOTH numeric and string folder ids', () => {
    // Regression: manage controls used `typeof value === 'number'`, which hid
    // them for string/UUID folder ids. Both folders must now be manageable.
    const fs = make()
    openPanel(fs)
    const dels = fs.el.querySelectorAll('.fp-fs-del')
    const rens = fs.el.querySelectorAll('.fp-fs-ren')
    expect(dels).toHaveLength(2)
    expect(rens).toHaveLength(2)
    const del = dels[0] as HTMLElement
    expect(del.tagName).toBe('BUTTON')
    expect(del.getAttribute('aria-label')).toContain('Photos')
  })

  it('does not render manage controls for All / Uncategorized', () => {
    const fs = make()
    openPanel(fs)
    // 4 option rows, but only the 2 real folders carry a delete button.
    expect(fs.el.querySelectorAll('.fp-fs-row')).toHaveLength(4)
    expect(fs.el.querySelectorAll('.fp-fs-del')).toHaveLength(2)
  })

  it('hides manage controls entirely when manageable is false', () => {
    const fs = make({ manageable: false })
    openPanel(fs)
    expect(fs.el.querySelectorAll('.fp-fs-del')).toHaveLength(0)
  })

  it('selecting an option fires onChange with its value and closes the panel', () => {
    let picked: unknown = 'unset'
    const fs = make({ onChange: (v) => (picked = v) })
    openPanel(fs)
    const photos = [...fs.el.querySelectorAll<HTMLButtonElement>('.fp-fs-opt')].find((o) =>
      o.textContent?.includes('Photos'),
    )
    photos?.click()
    expect(picked).toBe(5)
    expect(fs.el.querySelector('.fp-fs-panel')?.hasAttribute('hidden')).toBe(true)
  })

  it('selects a string-id folder correctly', () => {
    let picked: unknown = 'unset'
    const fs = make({ onChange: (v) => (picked = v) })
    openPanel(fs)
    const docs = [...fs.el.querySelectorAll<HTMLButtonElement>('.fp-fs-opt')].find((o) =>
      o.textContent?.includes('Docs'),
    )
    docs?.click()
    expect(picked).toBe('uuid-1')
  })

  it('creates a folder from the search box', async () => {
    let created = ''
    const fs = make({
      getFolders: () => [],
      onCreate: async (name) => {
        created = name
        return { id: 9, name }
      },
    })
    openPanel(fs)
    const search = fs.el.querySelector('.fp-fs-search') as HTMLInputElement
    search.value = 'New Folder'
    search.dispatchEvent(new Event('input'))
    ;(fs.el.querySelector('.fp-fs-create') as HTMLButtonElement).click()
    await tick()
    expect(created).toBe('New Folder')
  })

  it('wires the listbox for assistive tech (role, name, aria-controls)', () => {
    const fs = make({ label: 'Folder' })
    const list = fs.el.querySelector('.fp-fs-list')
    expect(list?.getAttribute('role')).toBe('listbox')
    expect(list?.getAttribute('aria-label')).toBe('Folder')
    expect(list?.id).toBeTruthy()
    expect(fs.el.querySelector('.fp-fs-trigger')?.getAttribute('aria-controls')).toBe(list?.id)
  })

  it('moves focus into the list with ArrowDown and selects with the option', () => {
    const fs = make({ getFolders: () => [{ id: 5, name: 'Photos' }] })
    openPanel(fs)
    const search = fs.el.querySelector('.fp-fs-search') as HTMLInputElement
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    const opts = fs.el.querySelectorAll<HTMLButtonElement>('.fp-fs-opt')
    expect(document.activeElement).toBe(opts[0])
  })
})
