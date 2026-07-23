import { FilePicker } from '@anil-labs/file-picker-core'
import type { MediaItem } from '@anil-labs/file-picker-core'
import '@anil-labs/file-picker-core/styles.css'
import './styles.css'
import { createDemoAdapter, sampleSelection } from './seed'

// This page has no framework: every demo is a direct `new FilePicker()` over
// one in-memory adapter, which is exactly the point it is making.

const el = <T extends HTMLElement>(id: string): T => {
  const node = document.getElementById(id)
  if (!node) throw new Error(`Landing page markup is missing #${id}`)
  return node as T
}

const escapeText = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ------------------------------------------------------------------ chrome

el('version-badge').textContent = `v${__PKG_VERSION__}`

// --- Install command -------------------------------------------------------

const copyBtn = el<HTMLButtonElement>('install-copy')
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(el('install-cmd').textContent ?? '')
    copyBtn.textContent = 'Copied'
  } catch {
    // Clipboard access is permission-gated and missing over plain http on some
    // browsers. A silent no-op reads as a dead button, so say what happened.
    copyBtn.textContent = 'Copy failed'
  }
  setTimeout(() => {
    copyBtn.textContent = 'Copy'
  }, 1400)
})

// --- Page theme ------------------------------------------------------------

type Theme = 'light' | 'dark' | 'auto'

const themeSwitch = el('theme-switch')

// The page is themed through --pg-* variables keyed off this attribute. The
// pickers theme themselves (each ships a light/dark toggle in its header and
// respects prefers-color-scheme), so there is nothing to notify here.
function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  themeSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.theme === theme))
  })
  themeSwitch.dataset.active = theme
}

themeSwitch.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-theme]')
  if (button) applyTheme(button.dataset.theme as Theme)
})

// ------------------------------------------------------------------- demos

// Each picker gets its own adapter instance (see seed.ts) and shares the same
// 'auto' theme with an in-header toggle. mountTrigger builds the open button;
// mountSelected renders the chosen items and keeps itself in sync.
interface DemoSpec {
  trigger: string
  selected: string
  label: string
  options: ConstructorParameters<typeof FilePicker>[0]
}

const DEMOS: DemoSpec[] = [
  {
    trigger: 't-hero',
    selected: 's-hero',
    label: 'Open the media library',
    options: {
      adapter: createDemoAdapter(),
      multiple: true,
      title: 'Media Library',
      theme: 'auto',
      selected: sampleSelection(),
    },
  },
  {
    trigger: 't-single',
    selected: 's-single',
    label: 'Choose an image',
    options: {
      adapter: createDemoAdapter(),
      multiple: false,
      title: 'Pick an image',
      theme: 'auto',
    },
  },
  {
    trigger: 't-multi',
    selected: 's-multi',
    label: 'Choose images',
    options: {
      adapter: createDemoAdapter(),
      multiple: true,
      maxSelection: 4,
      title: 'Select up to 4',
      theme: 'auto',
    },
  },
  {
    trigger: 't-readonly',
    selected: 's-readonly',
    label: 'Browse the library',
    options: {
      adapter: createDemoAdapter(),
      multiple: true,
      allowUpload: false,
      allowEdit: false,
      allowDelete: false,
      manageFolders: false,
      title: 'Browse media',
      theme: 'auto',
    },
  },
  {
    trigger: 't-modal',
    selected: 's-modal',
    label: 'Open (modal layout)',
    options: {
      adapter: createDemoAdapter(),
      multiple: true,
      layout: 'modal',
      title: 'Media Library',
      theme: 'auto',
    },
  },
]

for (const { trigger, selected, label, options } of DEMOS) {
  const picker = new FilePicker(options)
  picker.mountTrigger(el(trigger), { label })
  picker.mountSelected(el(selected))
}

// --- Events demo — the guard drives this one to prove the engine runs.
const eventsPicker = new FilePicker({
  adapter: createDemoAdapter(),
  multiple: true,
  title: 'Media Library',
  theme: 'auto',
  selected: sampleSelection(),
})
eventsPicker.mountTrigger(el('t-events'), { label: 'Open & watch events' })
eventsPicker.mountSelected(el('s-events'))

const eventsLog = el('events-log')
let logged = false
const logLine = (kind: string, detail: string): void => {
  if (!logged) {
    eventsLog.innerHTML = ''
    logged = true
  }
  const row = document.createElement('div')
  row.className = 'log-row'
  row.innerHTML = `<span class="k">${escapeText(kind)}</span> ${escapeText(detail)}`
  eventsLog.prepend(row)
  while (eventsLog.childElementCount > 24) eventsLog.lastElementChild?.remove()
}
eventsLog.innerHTML =
  '<div class="empty">Open the picker and pick something — events appear here…</div>'

const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

eventsPicker.on('change', (items) => logLine('change', `${items.length} — ${names(items)}`))
eventsPicker.on('select', (items) =>
  logLine('select ✓', `confirmed ${items.length} — ${names(items)}`),
)
eventsPicker.on('upload', (items) => logLine('upload', `${items.length} file(s) — ${names(items)}`))
eventsPicker.on('delete', (item) => logLine('delete', item.filename))
eventsPicker.on('error', (err) => logLine('error', String(err)))

// ----------------------------------------------------------------- theming

const ACCENTS = {
  blue: '#3b82f6',
  emerald: '#10b981',
  rose: '#f43f5e',
  amber: '#f59e0b',
  violet: '#8b5cf6',
} as const

type AccentName = keyof typeof ACCENTS

const accentScope = el('fp-accent-scope')
const accentSwitch = el('accent-switch')
const accentCode = el('accent-code')

function applyAccent(name: AccentName): void {
  const value = ACCENTS[name]
  // The whole theming API: set --fp-accent on any ancestor. Scoping it to this
  // preview re-accents just this block; setting it on :root would recolour
  // every picker on the page at once.
  accentScope.style.setProperty('--fp-accent', value)
  accentCode.textContent = `:root {\n  --fp-accent: ${value};\n}`
  accentSwitch.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.accent === name))
  })
}

accentSwitch.addEventListener('click', (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button[data-accent]')
  if (button) applyAccent(button.dataset.accent as AccentName)
})

applyAccent('blue')

// -------------------------------------------------------------- frameworks

interface FrameworkDemo {
  slug: string
  label: string
  desc: string
}

const FRAMEWORKS: FrameworkDemo[] = [
  {
    slug: 'vanilla',
    label: 'Vanilla JS',
    desc: 'The raw FilePicker engine over an in-memory adapter — no framework.',
  },
  {
    slug: 'react',
    label: 'React',
    desc: 'The <FilePicker> component with the useFilePicker() hook.',
  },
  {
    slug: 'vue',
    label: 'Vue 3',
    desc: 'The <FilePicker> component with useFilePicker().',
  },
  {
    slug: 'svelte',
    label: 'Svelte',
    desc: 'The createFilePicker() controller and <FilePicker> component.',
  },
  {
    slug: 'solid',
    label: 'Solid',
    desc: 'The <FilePicker> component with useFilePicker() signals.',
  },
  {
    slug: 'element',
    label: 'Web Component',
    desc: 'The <file-picker> custom element — any framework or plain HTML.',
  },
]

el('fw-grid').innerHTML = FRAMEWORKS.map(
  ({ slug, label, desc }) => `
    <a class="fw-card" href="./${slug}/">
      <span class="fw-badge">${escapeText(label)}</span>
      <p class="fw-desc">${escapeText(desc)}</p>
      <span class="fw-cta">Open playground &rarr;</span>
    </a>`,
).join('')

// Apply the initial page theme last so the switch reflects it.
applyTheme('light')
