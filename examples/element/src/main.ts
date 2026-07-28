import '@anil-labs/file-picker-element'
import '@anil-labs/file-picker-core/styles.css'
import './style.css'
import type { FilePickerElement, MediaItem } from '@anil-labs/file-picker-element'
import { createDemoAdapter } from './seed'

const $ = <T extends Element = HTMLElement>(sel: string): T => document.querySelector(sel) as T

// The adapter is an object, so it is set as a JS property (not an attribute).
// Both pickers on this page share one, so they browse the same library.
const adapter = createDemoAdapter()
const picker = $<FilePickerElement>('#picker')
picker.adapter = adapter

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

// --- the picker as a form field --------------------------------------------

// <file-picker> is not a form-associated element, so it submits nothing on its
// own. Mirroring the selection into hidden inputs is all it takes: `fp:change`
// fires whenever the selection changes, so the form and the thumbnails the
// element renders never disagree.
const formPicker = $<FilePickerElement>('#form-picker')
formPicker.adapter = adapter

const hiddenHost = $('#form-hidden')
const hintEl = $('#form-hint')

const syncHiddenInputs = (list: MediaItem[]): void => {
  hiddenHost.innerHTML = ''
  for (const item of list) {
    const input = document.createElement('input')
    input.type = 'hidden'
    // `mediaIds[]` arrives as an array in PHP/Laravel/Rails; use `mediaIds`
    // for a plain repeated key.
    input.name = 'mediaIds[]'
    input.value = String(item.id)
    hiddenHost.append(input)
  }
  hintEl.innerHTML =
    `${list.length} hidden <code>mediaIds[]</code> input${list.length === 1 ? '' : 's'} — ` +
    `the trigger is a <code>type="button"</code>, so opening the picker never submits the form.`
}

formPicker.addEventListener('fp:change', (e) => syncHiddenInputs(items(e)))
syncHiddenInputs([])

// This prints the exact FormData the browser would post, so you can see what
// arrives server-side.
const describeSubmission = (form: HTMLFormElement): string => {
  const entries = [...new FormData(form).entries()]
  const width = Math.max(...entries.map(([key]) => key.length), 0)
  const lines = entries.map(
    ([key, value]) => `${key.padEnd(width)} = ${String(value) || '(empty)'}`,
  )
  if (!entries.some(([key]) => key === 'mediaIds[]')) {
    lines.push('', '(no mediaIds[] field at all — nothing is selected)')
  }
  return [`POST /api/posts — ${entries.length} field(s)`, '', ...lines].join('\n')
}

const form = $<HTMLFormElement>('#form')
form.addEventListener('submit', (event) => {
  // A real app would let this submit (or post it with fetch); the demo just
  // shows the payload instead of navigating away.
  event.preventDefault()
  $('#payload').textContent = describeSubmission(form)
})
