---
'@anil-labs/file-picker-element': minor
---

The `<file-picker>` element now reaches feature parity with the framework bindings. Added the `close-on-select`, `max-selection` and `search-debounce` attributes, and `perPageOptions`, `renderEmpty`, `renderLoading`, `renderCardMeta` and `headerActions` as JS properties (mirroring the existing `typeFilters`/`labels` setters). Also re-exports the `TypeFilterOption` and `FilePickerLabels` types, which the setters accept.
