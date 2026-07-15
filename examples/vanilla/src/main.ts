import { FilePicker } from '@anil-labs/file-picker-core'
import type { MediaItem } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'
import './style.css'
import { createDemoAdapter } from './seed'

const $ = <T extends Element = HTMLElement>(sel: string): T => document.querySelector(sel) as T

const picker = new FilePicker({
  adapter: createDemoAdapter(),
  multiple: true,
  title: 'Media Library',
})

picker.mountTrigger($('#trigger'), { label: 'Choose media' })
picker.mountSelected($('#selected'))

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
  logEl.prepend(row)
}
const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

picker.on('change', (items) => log('change', `${items.length} selected — ${names(items)}`))
picker.on('select', (items) => log('select ✓', `confirmed ${items.length} — ${names(items)}`))
picker.on('upload', (items) => log('upload', `${items.length} file(s) — ${names(items)}`))
picker.on('delete', (item) => log('delete', item.filename))
picker.on('error', (err) => log('error', String(err)))
