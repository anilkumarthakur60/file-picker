import { FilePicker } from '@anil-labs/file-picker-core'
import type { MediaItem } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'
import './style.css'
import { createDemoAdapter } from './seed'

const $ = <T extends Element = HTMLElement>(sel: string): T => document.querySelector(sel) as T

// Both pickers on this page browse the same in-memory library.
const adapter = createDemoAdapter()

const picker = new FilePicker({
  adapter,
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

picker.on('change', (items) => log('change', `${items.length} selected  ${names(items)}`))
picker.on('select', (items) => log('select ✓', `confirmed ${items.length}  ${names(items)}`))
picker.on('upload', (items) => log('upload', `${items.length} file(s)  ${names(items)}`))
picker.on('delete', (item) => log('delete', item.filename))
picker.on('error', (err) => log('error', String(err)))

// --- the picker as a form field --------------------------------------------

// The picker is not an <input>, so it contributes nothing to a form on its own.
// Mirroring the selection into hidden inputs is all it takes: `change` fires
// whenever the selection changes (the same event the selected strip renders
// from), so the form and the thumbnails never disagree.
const formPicker = new FilePicker({ adapter, multiple: true, title: 'Attach media' })
formPicker.mountTrigger($('#form-trigger'), { label: 'Attach media' })
formPicker.mountSelected($('#form-selected'))

const hiddenHost = $('#form-hidden')
const hintEl = $('#form-hint')

const syncHiddenInputs = (items: MediaItem[]): void => {
  hiddenHost.innerHTML = ''
  for (const item of items) {
    const input = document.createElement('input')
    input.type = 'hidden'
    // `mediaIds[]` arrives as an array in PHP/Laravel/Rails; use `mediaIds`
    // for a plain repeated key.
    input.name = 'mediaIds[]'
    input.value = String(item.id)
    hiddenHost.append(input)
  }
  hintEl.innerHTML =
    `${items.length} hidden <code>mediaIds[]</code> input${items.length === 1 ? '' : 's'}  ` +
    `the trigger is a <code>type="button"</code>, so opening the picker never submits the form.`
}

formPicker.on('change', syncHiddenInputs)
syncHiddenInputs(formPicker.getSelected())

// Renders the posted FormData as the JSON a backend parses it into. Repeated
// `mediaIds[]` fields collapse into one array under `mediaIds`  the `[]` suffix
// is wire syntax, not part of the field name. Values stay strings because that
// is what a multipart body carries; casting them here would hide the fact that
// your server has to. With nothing selected there is no `mediaIds` key at all,
// which is the case worth designing for.
const describeSubmission = (form: HTMLFormElement): string => {
  const payload: Record<string, string | string[]> = {}
  for (const [rawKey, value] of new FormData(form).entries()) {
    const repeated = rawKey.endsWith('[]')
    const key = repeated ? rawKey.slice(0, -2) : rawKey
    const text = String(value)
    if (!repeated) {
      payload[key] = text
      continue
    }
    const bucket = payload[key]
    if (Array.isArray(bucket)) bucket.push(text)
    else payload[key] = [text]
  }
  return JSON.stringify(payload, null, 2)
}

const form = $<HTMLFormElement>('#form')
form.addEventListener('submit', (event) => {
  // A real app would let this submit (or post it with fetch); the demo just
  // shows the payload instead of navigating away.
  event.preventDefault()
  $('#payload').textContent = describeSubmission(form)
})
