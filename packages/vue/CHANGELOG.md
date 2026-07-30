# @anil-labs/file-picker-vue

## 0.1.1

### Patch Changes

- Maintenance release. Toolchain and development dependencies refreshed across the
  repository — Vite 8.2, `@vitejs/plugin-react` 6.0.5 and the GitHub Actions suite to v5 —
  and the documentation site is now published at
  https://anilkumarthakur60.github.io/file-picker/, so the links in each package README
  resolve.

  No runtime code changed: the shipped bundles, type declarations, stylesheet and public API
  are identical to 0.1.0.

- Updated dependencies
  - @anil-labs/file-picker-core@0.1.1

## 0.1.0

Initial release.

- `useFilePicker` composable and a `<FilePicker>` component for Vue 3.3+.

- `v-model` support for the selection: always emitted as `MediaItem[]` in single and multiple mode alike, accepting a bare item or `null` inbound, and taking precedence over `options.selected`.

- Both inbound selection paths share one id-keyed watcher, so the component's own write-back cannot re-enter the engine.

- Requires Node >= 22.
