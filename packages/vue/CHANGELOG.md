# @anil-labs/file-picker-vue

## 0.1.0

Initial release.

- `useFilePicker` composable and a `<FilePicker>` component for Vue 3.3+.

- `v-model` support for the selection: always emitted as `MediaItem[]` in single and multiple mode alike, accepting a bare item or `null` inbound, and taking precedence over `options.selected`.

- Both inbound selection paths share one id-keyed watcher, so the component's own write-back cannot re-enter the engine.

- Requires Node >= 22.
