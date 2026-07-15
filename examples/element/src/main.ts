import '@anil-labs/file-picker-element'
import '@anil-labs/file-picker-core/styles.css'
import './style.css'
import type { FilePickerElement, MediaItem } from '@anil-labs/file-picker-element'
import { createDemoAdapter } from './seed'

const $ = <T extends Element = HTMLElement>(sel: string): T => document.querySelector(sel) as T

// The adapter is an object, so it is set as a JS property (not an attribute).
const picker = $<FilePickerElement>('#picker')
picker.adapter = createDemoAdapter()

const logEl = $('#log')
let logged = false
const log = (kind: string, detail: string): void => {
  if (!logged) {
    logEl.innerHTML = ''
    logged = true
  }
  const row = document.createElement('div')
  row.className = 'log-row'
  row.innerHTML = `<span class="k">${kind}</span> ${detail}`
  logEl.append(row)
}

const items = (e: Event): MediaItem[] => (e as CustomEvent<MediaItem[]>).detail
const names = (list: MediaItem[]): string => list.map((m) => m.filename).join(', ') || '(none)'

// `event.detail` is the MediaItem[] array on every fp:* event.
picker.addEventListener('fp:change', (e) =>
  log('change', `${items(e).length} selected — ${names(items(e))}`),
)
picker.addEventListener('fp:select', (e) =>
  log('select ✓', `confirmed ${items(e).length} — ${names(items(e))}`),
)
picker.addEventListener('fp:upload', (e) =>
  log('upload', `${items(e).length} file(s) — ${names(items(e))}`),
)
