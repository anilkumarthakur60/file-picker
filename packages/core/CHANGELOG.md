# @anil-labs/file-picker-core

## 0.1.0

Initial release.

- Framework-agnostic picker engine: folders, upload, search, type/tag filters, inline metadata editing, delete, and single/multi selection with shift-click ranges.

- Pluggable `FilePickerAdapter` contract, plus `createMemoryAdapter()` for demos and tests and `createRestAdapter()` for a JSON/REST backend.

- `createRestAdapter` defaults target a Laravel `fast-api-crud` v3 media API: `medias` / `media-folders` endpoints, `page` + `rowsPerPage` pagination (`rowsPerPage=0` for all), and scope filters in a single JSON `filters` param. Override `toListParams`, `mapMedia`, `mapFolder` or `parseList` for other shapes.

- Uploads ignore rows without a usable id, so an API that answers with only a message returns `[]` rather than a phantom item.

- Theming through `--fp-*` custom properties with light/dark/auto; `--fp-accent` colours text and borders while `--fp-accent-solid` fills controls, so both stay legible in either theme.

- Selection is shown by the card checkbox alone — cards take no border, and the keyboard focus ring is gated behind real key input.

- Accessibility: roving tabindex over the grid, `role="listbox"`/`option`, focus trapping in dialogs, 44px touch targets, RTL via logical properties, and `prefers-reduced-motion` support.

- Ships `styles.css`; `sideEffects` whitelists `**/*.css` so bundlers keep it.

- Requires Node >= 22.
