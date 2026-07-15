import { describe, it, expect } from 'vitest'
import { createMemoryAdapter } from '../src'
import type { MediaFolder, MediaItem } from '../src'

const media = (id: number, over: Partial<MediaItem> = {}): MediaItem => ({
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
  ...over,
})
const folder = (id: number, name: string): MediaFolder => ({ id, name })

describe('memory adapter', () => {
  it('lists and paginates', async () => {
    const a = createMemoryAdapter({
      media: Array.from({ length: 30 }, (_, i) => media(i + 1)),
      latency: 0,
    })
    const p1 = await a.listMedia({ page: 1, perPage: 12 })
    expect(p1.items).toHaveLength(12)
    expect(p1.total).toBe(30)
    expect(p1.lastPage).toBe(3)
    const p3 = await a.listMedia({ page: 3, perPage: 12 })
    expect(p3.items).toHaveLength(6)
  })

  it('filters by type, search, tag and folder', async () => {
    const a = createMemoryAdapter({
      media: [
        media(1, { type: 'image', filename: 'cat.png', tags: ['pet'] }),
        media(2, { type: 'video', filename: 'dog.mp4' }),
        media(3, { type: 'image', folderId: 5 }),
      ],
      folders: [folder(5, 'Photos')],
      latency: 0,
    })
    expect((await a.listMedia({ page: 1, perPage: 10, type: 'image' })).items).toHaveLength(2)
    expect((await a.listMedia({ page: 1, perPage: 10, search: 'cat' })).items).toHaveLength(1)
    expect((await a.listMedia({ page: 1, perPage: 10, tag: 'pet' })).items).toHaveLength(1)
    expect((await a.listMedia({ page: 1, perPage: 10, folder: 5 })).items).toHaveLength(1)
    expect(
      (await a.listMedia({ page: 1, perPage: 10, folder: 'uncategorized' })).items,
    ).toHaveLength(2)
  })

  it('create + delete folder moves its media to uncategorized', async () => {
    const a = createMemoryAdapter({ media: [media(1)], latency: 0 })
    const f = await a.createFolder('New')
    await a.updateMedia(1, { folderId: f.id })
    expect((await a.listMedia({ page: 1, perPage: 10, folder: f.id })).items).toHaveLength(1)
    await a.deleteFolder(f.id)
    expect(await a.listFolders()).toHaveLength(0)
    expect(
      (await a.listMedia({ page: 1, perPage: 10, folder: 'uncategorized' })).items,
    ).toHaveLength(1)
  })

  it('updateMedia patches fields', async () => {
    const a = createMemoryAdapter({ media: [media(1)], latency: 0 })
    const u = await a.updateMedia(1, { alt: 'hello', tags: ['a', 'b'] })
    expect(u.alt).toBe('hello')
    expect(u.tags).toEqual(['a', 'b'])
  })

  it('uploadMedia adds derived items', async () => {
    const a = createMemoryAdapter({ latency: 0 })
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const created = await a.uploadMedia([file], { folderId: null })
    expect(created).toHaveLength(1)
    expect(created[0]?.type).toBe('image')
    expect(created[0]?.filename).toBe('photo.jpg')
    expect((await a.listMedia({ page: 1, perPage: 10 })).total).toBe(1)
  })

  it('deleteMedia removes an item', async () => {
    const a = createMemoryAdapter({ media: [media(1), media(2)], latency: 0 })
    await a.deleteMedia(1)
    expect((await a.listMedia({ page: 1, perPage: 10 })).total).toBe(1)
  })

  it('listFolders reports media counts', async () => {
    const a = createMemoryAdapter({
      media: [media(1, { folderId: 5 }), media(2, { folderId: 5 }), media(3)],
      folders: [folder(5, 'Photos')],
      latency: 0,
    })
    const folders = await a.listFolders()
    expect(folders[0]?.mediaCount).toBe(2)
  })
})
