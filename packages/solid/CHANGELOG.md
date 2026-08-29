# @anil-labs/file-picker-solid

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

- Solid 1.8+ bindings: a `createFilePicker` primitive and a `<FilePicker>` component.

- Full event coverage forwarded from the engine (select, change, upload, delete, error, open, close, theme).

- Requires Node >= 22.
