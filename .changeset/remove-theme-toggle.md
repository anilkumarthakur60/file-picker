---
'@anil-labs/file-picker-core': minor
'@anil-labs/file-picker-element': minor
---

**Breaking:** remove the built-in light/dark theme toggle. The picker is meant to be embedded in apps that already own theming (e.g. a switch in the navbar), so it no longer renders its own toggle button.

Removed: the `themeToggle` option, the `toggleTheme` label, and the `<file-picker>` element's `theme-toggle` attribute. Theming stays fully host-driven and unchanged: the `theme` option, `setTheme()`, `resolvedTheme`, and the `theme` event still work, and `'auto'` still follows the OS. Drive the picker's theme from your app instead of relying on the in-picker button.
