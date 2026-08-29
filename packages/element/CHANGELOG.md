# @anil-labs/file-picker-element

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

- `<file-picker>` custom element  registered on import, no framework required.

- Attribute and property coverage for the engine's options, with `fp:*` DOM events for every callback.

- Declares `"sideEffects": true`, since importing the package defines the element.

- Requires Node >= 22.
