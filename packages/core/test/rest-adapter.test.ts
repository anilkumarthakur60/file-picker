import { describe, it, expect } from 'vitest'
import { createRestAdapter } from '../src'

/** A fake `fetch` that records calls and returns a canned response. */
const makeFetch = (
  handler: (url: string, init?: RequestInit) => { status?: number; body?: unknown },
): { fn: typeof fetch; calls: { url: string; init?: RequestInit | undefined }[] } => {
  const calls: { url: string; init?: RequestInit | undefined }[] = []
  const fn = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const { status = 200, body } = handler(url, init)
    return {
      ok: status >= 200 && status < 300,
      status,
      text: async () => (body === undefined ? '' : JSON.stringify(body)),
    } as unknown as Response
  }) as unknown as typeof fetch
  return { fn, calls }
}

describe('REST adapter', () => {
  it('lists media: joins the base URL, sends query params and maps fields', async () => {
    const { fn, calls } = makeFetch(() => ({
      body: {
        data: [
          {
            id: 1,
            folder_id: 5,
            filename: 'a.png',
            mime_type: 'image/png',
            aggregate_type: 'image',
            size: '10',
            url: 'http://x/a.png',
          },
        ],
        meta: { total: 42, last_page: 4 },
      },
    }))
    // no trailing slash on baseUrl — the adapter must add it
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    const page = await a.listMedia({ page: 2, perPage: 12, search: 'cat', folder: 5 })

    expect(calls[0]?.url).toContain('https://api.test/medias?')
    expect(calls[0]?.url).toContain('page=2')
    expect(calls[0]?.url).toContain('rowsPerPage=12')
    // Scope filters travel as one JSON `filters` param, not flat query params.
    const filters = new URL(calls[0]?.url ?? '').searchParams.get('filters')
    expect(JSON.parse(filters ?? '{}')).toEqual({ queryFilter: 'cat', folderFilter: '5' })
    expect(page.total).toBe(42)
    expect(page.lastPage).toBe(4)
    const item = page.items[0]
    expect(item?.id).toBe(1)
    expect(item?.folderId).toBe(5)
    expect(item?.type).toBe('image')
    expect(item?.src).toBe('http://x/a.png')
  })

  it('maps the "uncategorized" folder scope to a null filter', async () => {
    const { fn, calls } = makeFetch(() => ({ body: { data: [], meta: { total: 0 } } }))
    const a = createRestAdapter({ baseUrl: 'https://api.test/', fetch: fn })
    await a.listMedia({ page: 1, perPage: 10, folder: 'uncategorized' })
    const filters = new URL(calls[0]?.url ?? '').searchParams.get('filters')
    expect(JSON.parse(filters ?? '{}')).toEqual({ folderFilter: 'null' })
  })

  it('omits the filters param entirely when nothing is filtered', async () => {
    const { fn, calls } = makeFetch(() => ({ body: { data: [], meta: { total: 0 } } }))
    const a = createRestAdapter({ baseUrl: 'https://api.test/', fetch: fn })
    await a.listMedia({ page: 1, perPage: 10 })
    expect(new URL(calls[0]?.url ?? '').searchParams.has('filters')).toBe(false)
  })

  it('uploadMedia returns [] when the API answers with only a message', async () => {
    // Laravel `fast-api-crud` replies `{"data":{"message":"..."}}` on upload.
    // Mapping that produced one phantom item with an empty id.
    const { fn } = makeFetch(() => ({
      status: 201,
      body: { data: { message: 'Media uploaded successfully' } },
    }))
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    const file = new File(['x'], 'up.png', { type: 'image/png' })
    await expect(a.uploadMedia([file], { folderId: null })).resolves.toEqual([])
  })

  it('falls back to `uuid` for the id and to items.length for total', async () => {
    const { fn } = makeFetch(() => ({ body: { data: [{ uuid: 'abc', name: 'x.pdf' }] } }))
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    const page = await a.listMedia({ page: 1, perPage: 10 })
    expect(page.items[0]?.id).toBe('abc')
    expect(page.items[0]?.filename).toBe('x.pdf')
    expect(page.total).toBe(1)
  })

  it('deleteMedia issues DELETE and tolerates a 204 / empty body', async () => {
    const { fn, calls } = makeFetch(() => ({ status: 204 }))
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    await expect(a.deleteMedia(7)).resolves.toBeUndefined()
    expect(calls[0]?.url).toBe('https://api.test/medias/7')
    expect(calls[0]?.init?.method).toBe('DELETE')
  })

  it('throws on a non-ok response', async () => {
    const { fn } = makeFetch(() => ({ status: 500, body: { error: 'nope' } }))
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    await expect(a.listMedia({ page: 1, perPage: 10 })).rejects.toThrow(/500/)
  })

  it('uploadMedia posts FormData with the configured field and folder_id', async () => {
    let captured: RequestInit | undefined
    const { fn } = makeFetch((_url, init) => {
      captured = init
      return { body: { data: [{ id: 9, filename: 'up.png' }] } }
    })
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn, uploadField: 'files[]' })
    const file = new File(['x'], 'up.png', { type: 'image/png' })
    const created = await a.uploadMedia([file], { folderId: 3 })
    expect(created[0]?.id).toBe(9)
    const body = captured?.body as FormData
    expect(body.getAll('files[]')).toHaveLength(1)
    expect(body.get('folder_id')).toBe('3')
  })

  it('resolves async headers and always sends Accept: application/json', async () => {
    let seen: Headers | undefined
    const { fn } = makeFetch((_url, init) => {
      seen = init?.headers as Headers
      return { body: { data: [], meta: { total: 0 } } }
    })
    const a = createRestAdapter({
      baseUrl: 'https://api.test',
      fetch: fn,
      headers: async () => ({ Authorization: 'Bearer t' }),
    })
    await a.listMedia({ page: 1, perPage: 10 })
    expect(seen?.get('Authorization')).toBe('Bearer t')
    expect(seen?.get('Accept')).toBe('application/json')
  })

  it('updateMedia unwraps a { data } envelope and sends a JSON body', async () => {
    let captured: RequestInit | undefined
    const { fn, calls } = makeFetch((_url, init) => {
      captured = init
      return { body: { data: { id: 1, filename: 'renamed.png', folder_id: null } } }
    })
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    const updated = await a.updateMedia(1, { filename: 'renamed.png' })
    expect(updated.filename).toBe('renamed.png')
    expect(calls[0]?.init?.method).toBe('PUT')
    const body = JSON.parse(captured?.body as string) as { filename: string }
    expect(body.filename).toBe('renamed.png')
    expect((captured?.headers as Headers).get('Content-Type')).toBe('application/json')
  })

  it('createFolder unwraps the created folder', async () => {
    const { fn, calls } = makeFetch(() => ({ body: { data: { id: 12, name: 'New' } } }))
    const a = createRestAdapter({ baseUrl: 'https://api.test', fetch: fn })
    const folder = await a.createFolder('New')
    expect(folder.id).toBe(12)
    expect(folder.name).toBe('New')
    expect(calls[0]?.url).toBe('https://api.test/media-folders')
    expect(calls[0]?.init?.method).toBe('POST')
  })
})
