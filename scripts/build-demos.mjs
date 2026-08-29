// Assemble every example app into a single static site for deployment.
//
//   dist-demos/
//     index.html      <- the landing page (example-landing, built at base=/)
//     assets/         <- the landing page's own bundle
//     vanilla/ react/ vue/ svelte/ solid/ element/
//
// The landing page used to be a hardcoded HTML string generated right here  a
// link directory of framework cards, with no working picker on it. It is now a
// real Vite app under examples/landing, so it is typechecked, linted and
// formatted like everything else, and its demos are the live engine rather than
// a description of it.
//
// Run from the repo root:  node scripts/build-demos.mjs
// Vercel runs this as the project's build command (see vercel.json).

import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = join(root, 'dist-demos')

const run = (cmd) => {
  console.log(`\n$ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit' })
}

const demos = [
  { slug: 'vanilla', filter: 'example-vanilla' },
  { slug: 'react', filter: 'example-react' },
  { slug: 'vue', filter: 'example-vue' },
  { slug: 'svelte', filter: 'example-svelte' },
  { slug: 'solid', filter: 'example-solid' },
  { slug: 'element', filter: 'example-element' },
]

// 1. Build the workspace packages the examples depend on (core + bindings).
run('pnpm -r --filter "./packages/*" build')

// 2. Build each example into dist-demos/<slug> with a matching base path.
for (const { slug, filter } of demos) {
  run(
    `pnpm --filter ${filter} exec vite build --base=/${slug}/ --outDir=${join(outDir, slug)} --emptyOutDir`,
  )
}

// 3. Build the landing page into the root.
//
//    `--emptyOutDir` is deliberately omitted: dist-demos already holds the six
//    demo builds at this point, and Vite would wipe them. Vite warns when the
//    outDir sits outside its root and it isn't emptying it  that warning is
//    the expected outcome here, not a problem.
run(`pnpm --filter example-landing exec vite build --base=/ --outDir=${outDir}`)

// 4. Verify the deployed artifact, not just the one `pnpm build` produces.
//    This build bypasses the package's own build script (it overrides outDir),
//    so the guard has to be invoked explicitly against dist-demos.
run(`node examples/landing/scripts/check-page.mjs ${outDir}`)

console.log('\n✓ Landing page + 6 framework demos assembled in dist-demos/')
