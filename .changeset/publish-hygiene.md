---
'@anil-labs/file-picker-core': patch
'@anil-labs/file-picker-react': patch
'@anil-labs/file-picker-vue': patch
'@anil-labs/file-picker-svelte': patch
'@anil-labs/file-picker-solid': patch
'@anil-labs/file-picker-element': patch
---

Ship the MIT licence text with every package. All six declared `"license": "MIT"` but no
`LICENSE` file reached the tarball — npm only auto-includes one from the package directory,
never from the repository root.

`@anil-labs/file-picker-element` now states `"sideEffects": true` explicitly. Importing it
defines the `<file-picker>` custom element at module scope, so it is genuinely
side-effectful; the field was merely absent before, which bundlers treat as "assume side
effects". Correct by omission, but one tidy-up away from `false` silently tree-shaking the
registration out of production builds.
