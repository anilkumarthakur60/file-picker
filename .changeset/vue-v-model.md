---
'@anil-labs/file-picker-vue': minor
---

`<FilePicker>` now supports `v-model` for the selection: a `modelValue` prop plus an
`update:modelValue` emit alongside `@change`. The value is always emitted as `MediaItem[]` — in
single and multiple mode alike — so its type doesn't shift with `options.multiple`; inbound it also
accepts a bare `MediaItem` or `null`. When both are present, `v-model` takes precedence over
`options.selected`, and the two inbound paths now share one id-keyed watcher, so the component's own
write-back can't re-enter the engine.

The package also gains a test suite (it previously deferred to the core's), covering the round trip,
the no-feedback-loop guarantee, and `modelValue`/`options.selected` precedence.
