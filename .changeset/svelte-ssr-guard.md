---
'@anil-labs/file-picker-svelte': minor
---

Fix an SSR crash: `createFilePicker` constructed the DOM engine eagerly, so calling it at the top of a component `<script>` threw during SvelteKit's server render. Construction is now guarded and deferred — it returns an inert controller on the server and builds the real engine on the client (hydration / `onMount`).

Note: `controller.picker` is now typed `FilePickerCore | null` to reflect the SSR case; guard access (e.g. `controller.picker?.mountTrigger(...)`) or use it inside `onMount`.
