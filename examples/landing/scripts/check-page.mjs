#!/usr/bin/env node
// Post-build guard for the file-picker landing page.
//
// A broken landing page fails silently: the markup renders, the headings read
// correctly, and only the pickers — the point of the page — come up as dead
// buttons that open nothing. Typechecking cannot catch it either, since every
// wiring bug worth having (a renamed id, a picker never mounted, an adapter
// that returns nothing, a listener on the wrong element) is type-correct.
//
// So this mounts the real built artifact in happy-dom — the same DOM the core
// engine is unit-tested against — drives it, and asserts:
//
//   1. Every demo mounted a trigger, a selected strip and a (hidden) dialog.
//   2. The pre-seeded demos actually show their initial selection.
//   3. Opening the events picker loads the grid from the adapter, and clicking
//      an item emits `change` and writes it to the live event log — i.e. the
//      whole async pipeline runs, not just the static shell.
//
// Usage:  node scripts/check-page.mjs [outDir]     (default: dist)

import { createRequire } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, resolve } from 'node:path'
import { readFileSync } from 'node:fs'

const here = dirname(fileURLToPath(import.meta.url))
const pkgRoot = resolve(here, '..')
const require = createRequire(resolve(pkgRoot, 'package.json'))

const outDir = resolve(pkgRoot, process.argv[2] ?? 'dist')

const failures = []
const check = (condition, msg) => {
  if (!condition) failures.push(msg)
}

// ------------------------------------------------------------------ bootstrap

const html = readFileSync(resolve(outDir, 'index.html'), 'utf8')

const scriptSrc = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1]
if (!scriptSrc) {
  console.error('✗ check-page: no module script found in index.html')
  process.exit(1)
}

const { Window } = require('happy-dom')
const window = new Window({
  url: 'http://localhost/',
  // Don't let happy-dom fetch/run the page's own <script src> — this guard
  // imports the bundle itself with the globals registered below.
  settings: { disableJavaScriptFileLoading: true, disableJavaScriptEvaluation: true },
})

// The imported bundle and the engine reference these as globals.
for (const key of [
  'window',
  'document',
  'navigator',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'MutationObserver',
  'ResizeObserver',
  'customElements',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'Image',
  'DOMParser',
]) {
  if (window[key] !== undefined) {
    Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true })
  }
}

window.document.write(html)

// The bundle's top-level code runs on import — that IS the wiring under test.
await import(pathToFileURL(resolve(outDir, scriptSrc.replace(/^\.?\//, ''))).href)
await window.happyDOM.waitUntilComplete()

const doc = window.document
const $ = (sel) => doc.querySelector(sel)
const $$ = (sel) => [...doc.querySelectorAll(sel)]
const text = (sel) => $(sel)?.textContent ?? ''
const click = (elem) => elem?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))

// ------------------------------------------------------------- every demo mounted

const DEMOS = ['t-hero', 't-single', 't-multi', 't-readonly', 't-modal', 't-events']
for (const id of DEMOS) {
  check($(`#${id} .fp-trigger`) !== null, `#${id}: no .fp-trigger mounted (picker never created).`)
}

check(text('#t-hero .fp-trigger').includes('Open the media library'), '#t-hero: wrong trigger label.')

// Every picker mounts a selected strip and a (hidden) overlay on <body>. The
// overlay (.fp-overlay) is what carries `hidden`; .fp-dialog is the card inside
// it and is never hidden on its own.
check($$('.fp-selected').length >= 6, `expected 6+ mounted selected strips, found ${$$('.fp-selected').length}.`)

const overlays = $$('.fp-overlay')
check(overlays.length >= 6, `expected 6+ picker overlays on <body>, found ${overlays.length}.`)
check(
  overlays.every((o) => o.hidden === true),
  'a picker overlay was already open before any trigger was clicked.',
)

// The hero and events demos start pre-selected — prove the `selected` option and
// the selected-strip renderer are wired.
check(($('#s-hero .fp-selected')?.childElementCount ?? 0) > 0, '#s-hero: initial selection did not render.')

// -------------------------------------------------- open → load → select (events)

click($('#t-events .fp-trigger'))
await window.happyDOM.waitUntilComplete()

const openOverlay = $$('.fp-overlay').find((o) => o.hidden === false)
check(openOverlay != null, 'events picker: clicking the trigger did not open a dialog.')

const cards = openOverlay ? [...openOverlay.querySelectorAll('.fp-card')] : []
check(cards.length > 0, 'events picker: the grid rendered no items — the adapter/render pipeline did not run.')

if (cards.length > 0) {
  click(cards[0])
  await window.happyDOM.waitUntilComplete()

  check($('#events-log .empty') === null, '#events-log: placeholder not cleared after selecting an item.')
  check(
    $$('#events-log .log-row').length >= 1,
    '#events-log: selecting an item logged no `change` event — the event wiring is broken.',
  )
}

// --------------------------------------------------------------- theme switch

click($('#theme-switch button[data-theme="dark"]'))
check(
  doc.documentElement.dataset.theme === 'dark',
  'theme switch: <html data-theme> was not set to dark.',
)
check(
  $('#theme-switch button[data-theme="dark"]')?.getAttribute('aria-pressed') === 'true',
  'theme switch: aria-pressed was not moved to the active button.',
)

// --------------------------------------------------------------- accent picker

click($('#accent-switch button[data-accent="emerald"]'))
check(
  $('#fp-accent-scope')?.style.getPropertyValue('--fp-accent') === '#10b981',
  'accent picker: --fp-accent was not applied to the scope.',
)
check(text('#accent-code').includes('#10b981'), 'accent picker: the code sample did not update.')

// ------------------------------------------------------------------ chrome

check(/^v\d/.test(text('#version-badge')), '#version-badge: version was not injected.')

const fwLinks = $$('#fw-grid a')
check(fwLinks.length === 6, `#fw-grid: expected 6 framework cards, found ${fwLinks.length}.`)
for (const slug of ['vanilla', 'react', 'vue', 'svelte', 'solid', 'element']) {
  check(
    fwLinks.some((a) => a.getAttribute('href') === `./${slug}/`),
    `#fw-grid: no card links to ./${slug}/.`,
  )
}

// ---------------------------------------------------------------------- report

await window.happyDOM.abort()
await window.close()

if (failures.length > 0) {
  console.error(`\n✗ check-page: ${failures.length} problem(s) in ${outDir}\n`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}

console.log(`✓ check-page: landing demos verified in ${outDir}`)
