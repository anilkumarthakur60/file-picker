---
'@anil-labs/file-picker-core': minor
---

Correctness, accessibility, robustness and performance improvements to the core engine:

- **Folders work with string/UUID ids.** The folder-id checks used `typeof === 'number'`, silently breaking uploads, edits and rename/delete for backends whose folder ids are strings. Now handled via an `isFolderId()` guard.
- **Lifecycle:** `destroy()` now tears down trigger/selected hosts mounted via `mountTrigger`/`mountSelected` (and their listeners); added an optional `dispose()` to `FilePickerAdapter`, called from `destroy()`, which the in-memory adapter uses to revoke outstanding object URLs.
- **Accessibility:** real keyboard-reachable buttons for folder rename/delete, accessible names on filter/edit inputs, the preview is now a labelled `role="dialog"`, the folder list is an arrow-key-navigable listbox with `aria-selected`, grid action buttons are out of the tab order, and light-mode accent contrast now meets WCAG AA.
- **Robustness:** a failed background refetch keeps on-screen content (toast instead of wiping to an error state); `deleteMedia` keeps the pager total/page in sync; stale shift-range anchors are reset; the accept filter applies to the file-input path; `perPage` is clamped to ≥ 1.
- **Performance:** selection toggles patch the affected cards in place instead of rebuilding the whole grid.
- **RTL:** direction-dependent styles use logical properties, and filenames render with `dir="auto"`.
- **Edit dialog:** the image preview shows a shimmer while loading and falls back to a file-type tile if the image is missing/broken (previously a blank band).
