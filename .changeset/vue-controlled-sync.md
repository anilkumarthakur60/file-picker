---
'@anil-labs/file-picker-vue': patch
---

The `useFilePicker` composable now pushes controlled `selected` and `theme` changes into the engine after mount (id-keyed to avoid loops), matching the React hook and the `FilePicker` component. Consumers using the composable directly with reactive options no longer hit stale-prop bugs.
