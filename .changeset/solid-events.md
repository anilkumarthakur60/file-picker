---
'@anil-labs/file-picker-solid': patch
---

The ready-made `<FilePicker>` component now forwards all eight events — `onDelete`, `onError`, `onOpen`, `onClose` and `onThemeChange` were previously accepted as props but never fired. Also adds a controlled `theme` effect to the `useFilePicker` composable so runtime theme changes propagate into the engine (matching the React/Vue hooks).
