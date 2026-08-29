# @anil-labs/file-picker-react

## 0.1.1

### Patch Changes

- Maintenance release. Toolchain and development dependencies refreshed across the
  repository  Vite 8.2, `@vitejs/plugin-react` 6.0.5 and the GitHub Actions suite to v5 
  and the documentation site is now published at
  https://anilkumarthakur60.github.io/file-picker/, so the links in each package README
  resolve.

  No runtime code changed: the shipped bundles, type declarations, stylesheet and public API
  are identical to 0.1.0.

- Updated dependencies
  - @anil-labs/file-picker-core@0.1.1

## 0.1.0

Initial release.

- `useFilePicker` hook and a ready-made `<FilePicker>` component wrapping the core engine.

- Controlled `selected` and `theme` props are pushed into the engine after mount, keyed by id so an equal-but-new array cannot loop.

- Peer range covers React 17, 18 and 19.

- Requires Node >= 22.
