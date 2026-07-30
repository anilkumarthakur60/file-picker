---
'@anil-labs/file-picker-core': minor
'@anil-labs/file-picker-react': minor
'@anil-labs/file-picker-vue': minor
'@anil-labs/file-picker-svelte': minor
'@anil-labs/file-picker-solid': minor
'@anil-labs/file-picker-element': minor
---

Raise the supported Node range to `>=22`, from `>=18`.

Node 18 reached end-of-life in April 2025 and Node 20 in April 2026, and CI now verifies against
`[22, 24, 26]` only — so `engines: ">=18"` was promising two runtimes nothing tested. This aligns the
published contract with what is actually built and tested; no runtime code changed, and the bundles
themselves carry no Node-22-specific syntax.
