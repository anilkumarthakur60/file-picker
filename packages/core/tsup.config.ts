import { defineConfig } from 'tsup'
import { copyFile } from 'node:fs/promises'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'FilePicker',
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  onSuccess: async () => {
    await copyFile('src/styles.css', 'dist/styles.css')
  },
})
