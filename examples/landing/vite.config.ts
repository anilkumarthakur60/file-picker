import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

// Single source of truth for the version badge  read from the core package
// rather than hardcoded in markup, so a `changeset version` bump can never
// leave the landing page advertising a stale release.
const { version } = JSON.parse(readFileSync(here('../../packages/core/package.json'), 'utf8')) as {
  version: string
}

export default defineConfig({
  root: here('.'),
  base: process.env.BASE_URL ?? '/',

  cacheDir: here('../../node_modules/.vite-landing'),

  define: {
    __PKG_VERSION__: JSON.stringify(version),
  },

  server: { port: 5180, host: '127.0.0.1', strictPort: true },
})
