import { describe, it, expect, afterEach } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, type App, type VNode } from 'vue'
import { createMemoryAdapter, type MediaItem } from '@anil-labs/file-picker-core'
import { FilePicker } from '../src/index'

const item = (id: number): MediaItem => ({
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

/** The adapter resolves immediately, but the picker still renders across ticks. */
const settle = async (): Promise<void> => {
  for (let i = 0; i < 4; i++) {
    await nextTick()
    await new Promise((r) => setTimeout(r, 0))
  }
}

const $ = <T extends HTMLElement>(sel: string): T | null => document.querySelector<T>(sel)

// Scope every card query to the dialog. The `showSelected` strip renders
// `.fp-card` nodes too, and it precedes the overlay in the document — so a bare
// `.fp-card` selector starts matching the strip as soon as anything is selected.
const gridCard = (): HTMLElement | null => $<HTMLElement>('.fp-dialog .fp-card')

const selectedIds = (): (string | null)[] =>
  [...document.querySelectorAll<HTMLElement>('.fp-dialog .fp-card--selected')].map((c) =>
    c.getAttribute('data-id'),
  )

let app: App | null = null
let host: HTMLElement | null = null

/** `render` becomes the setup return value, so it re-runs on reactive change. */
const mount = (render: () => VNode): void => {
  host = document.createElement('div')
  document.body.append(host)
  app = createApp(defineComponent({ setup: () => render }))
  app.mount(host)
}

afterEach(() => {
  app?.unmount()
  app = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
})

describe('FilePicker v-model', () => {
  it('writes the selection back through update:modelValue', async () => {
    const adapter = createMemoryAdapter({ media: [item(1), item(2)], latency: 0 })
    const model = ref<MediaItem[]>([])
    mount(() =>
      h(FilePicker, {
        options: { adapter, multiple: true },
        modelValue: model.value,
        'onUpdate:modelValue': (v: MediaItem[]) => (model.value = v),
      }),
    )
    await settle()

    $<HTMLButtonElement>('.fp-trigger')?.click()
    await settle()
    gridCard()?.click()
    await settle()
    expect(model.value.map((m) => m.id)).toEqual([1])

    // Round-trips: the same click deselects, and the model follows.
    gridCard()?.click()
    await settle()
    expect(model.value).toHaveLength(0)
  })

  it('emitting back into the prop does not re-enter the picker', async () => {
    const adapter = createMemoryAdapter({ media: [item(1), item(2)], latency: 0 })
    const model = ref<MediaItem[]>([])
    let emits = 0
    mount(() =>
      h(FilePicker, {
        options: { adapter, multiple: true },
        modelValue: model.value,
        'onUpdate:modelValue': (v: MediaItem[]) => {
          emits++
          // A fresh array every time — the shape v-model actually produces, and
          // the one an identity check on the value would loop on.
          model.value = [...v]
        },
      }),
    )
    await settle()
    $<HTMLButtonElement>('.fp-trigger')?.click()
    await settle()
    gridCard()?.click()
    await settle()

    // One user action → exactly one emit. A feedback loop would inflate this.
    expect(emits).toBe(1)
    expect(model.value.map((m) => m.id)).toEqual([1])
  })

  it('seeds the picker from modelValue, which outranks options.selected', async () => {
    const adapter = createMemoryAdapter({ media: [item(1), item(2)], latency: 0 })
    mount(() =>
      h(FilePicker, {
        options: { adapter, multiple: true, selected: [item(2)] },
        modelValue: [item(1)],
        'onUpdate:modelValue': () => {},
      }),
    )
    await settle()
    $<HTMLButtonElement>('.fp-trigger')?.click()
    await settle()
    expect(selectedIds()).toEqual(['1'])
  })

  it('still honours options.selected when no v-model is bound', async () => {
    const adapter = createMemoryAdapter({ media: [item(1), item(2)], latency: 0 })
    mount(() => h(FilePicker, { options: { adapter, multiple: true, selected: [item(2)] } }))
    await settle()
    $<HTMLButtonElement>('.fp-trigger')?.click()
    await settle()
    expect(selectedIds()).toEqual(['2'])
  })
})
