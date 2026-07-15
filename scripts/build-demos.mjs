// Assemble every example app into a single static site for deployment.
//
//   dist-demos/
//     index.html      <- landing page (generated below)
//     vanilla/ react/ vue/ svelte/ solid/ element/
//
// Run from the repo root:  node scripts/build-demos.mjs
// Vercel runs this as the project's build command (see vercel.json).

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'dist-demos')

const run = (cmd) => {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

const demos = [
  {
    slug: 'vanilla',
    filter: 'example-vanilla',
    label: 'Vanilla',
    desc: 'The raw FilePicker engine + in-memory adapter — no framework.',
  },
  {
    slug: 'react',
    filter: 'example-react',
    label: 'React',
    desc: 'The <FilePicker> component with the useFilePicker() hook.',
  },
  {
    slug: 'vue',
    filter: 'example-vue',
    label: 'Vue 3',
    desc: 'The <FilePicker> component with useFilePicker().',
  },
  {
    slug: 'svelte',
    filter: 'example-svelte',
    label: 'Svelte',
    desc: 'The createFilePicker() controller and <FilePicker> component.',
  },
  {
    slug: 'solid',
    filter: 'example-solid',
    label: 'Solid',
    desc: 'The <FilePicker> component with useFilePicker() signals.',
  },
  {
    slug: 'element',
    filter: 'example-element',
    label: 'Web Component',
    desc: 'The <file-picker> custom element — any framework or plain HTML.',
  },
]

// 1. Build the workspace packages the examples depend on (core + bindings).
run('pnpm -r --filter "./packages/*" build')

// 2. Build each example into dist-demos/<slug> with a matching base path.
for (const { slug, filter } of demos) {
  run(
    `pnpm --filter ${filter} exec vite build --base=/${slug}/ --outDir=${join(outDir, slug)} --emptyOutDir`,
  )
}

// 3. Generate the landing page.
const cards = demos
  .map(
    ({ slug, label, desc }) => `
      <a class="card" href="/${slug}/">
        <div class="card-top"><span class="badge">${label}</span></div>
        <p class="desc">${desc}</p>
        <span class="cta">Open demo &rarr;</span>
      </a>`,
  )
  .join('')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@anil-labs/file-picker — live demos</title>
    <meta name="description" content="Live demos of @anil-labs/file-picker: a framework-agnostic media-library file picker with folders, upload, filters and editing — for React, Vue, Svelte, Solid and Web Components." />
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
        background: radial-gradient(1200px 600px at 50% -10%, #14243b 0%, #0f1116 55%);
        color: #ececf1;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 48px 20px;
      }
      main { width: 100%; max-width: 900px; }
      .hero { text-align: center; margin-bottom: 40px; }
      h1 { font-size: clamp(28px, 6vw, 44px); margin: 0 0 12px; letter-spacing: -0.02em; }
      .tag { color: #9a9aa8; font-size: 16px; max-width: 600px; margin: 0 auto; line-height: 1.5; }
      code { background: rgba(255,255,255,0.07); padding: 2px 7px; border-radius: 6px; font-size: 0.92em; }
      .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; }
      .card {
        display: flex; flex-direction: column; gap: 12px;
        padding: 22px; border-radius: 16px; text-decoration: none;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        color: inherit; transition: transform .15s ease, border-color .15s ease, background .15s ease;
      }
      .card:hover { transform: translateY(-3px); border-color: #3b82f6; background: rgba(59,130,246,0.08); }
      .badge {
        display: inline-block; padding: 4px 12px; border-radius: 999px;
        background: rgba(59,130,246,0.16); color: #7dabff; font-weight: 600; font-size: 14px;
      }
      .desc { margin: 0; color: #b7b7c4; font-size: 14px; line-height: 1.5; flex: 1; }
      .cta { color: #7dabff; font-weight: 600; font-size: 14px; }
      footer { margin-top: 40px; text-align: center; color: #75757f; font-size: 13px; }
      footer a { color: #7dabff; text-decoration: none; }
      footer a:hover { text-decoration: underline; }
    </style>
  </head>
  <body>
    <main>
      <div class="hero">
        <h1>@anil-labs/file-picker</h1>
        <p class="tag">A framework-agnostic <strong>media-library</strong> file picker — folders, upload, search &amp; type filters, editing and single/multi selection. Pick a demo:</p>
      </div>
      <div class="grid">${cards}
      </div>
      <footer>
        Every demo runs the same zero-dependency <code>@anil-labs/file-picker-core</code> engine with an in-memory adapter.
        <a href="https://github.com/anilkumarthakur60/file-picker">View on GitHub</a>
      </footer>
    </main>
  </body>
</html>
`

mkdirSync(dirname(join(outDir, 'index.html')), { recursive: true })
writeFileSync(join(outDir, 'index.html'), html)
console.log(`\n✓ Wrote landing page to dist-demos/index.html`)
console.log('✓ Demos assembled in dist-demos/')
