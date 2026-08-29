# Server-Side Rendering

The picker is a browser component  it renders to the DOM, so the engine can only live on the client.
Constructing `new FilePicker(...)` **throws synchronously** when there's no DOM (and also when no
adapter is given), so it must never run during SSR.

The good news: the framework bindings already handle this. The `<FilePicker>` components and the
`useFilePicker` / `createFilePicker` controllers build the engine **on mount, client-side only**, so
they render fine on the server in Next.js, Nuxt, SvelteKit and SolidStart with no extra work. This
page covers the few things to keep in mind.

## The stylesheet is SSR-safe

The CSS import is just a stylesheet  it never touches the DOM at import time, so import it anywhere,
including a server entry or root layout:

```ts
import '@anil-labs/file-picker-core/styles.css'
```

## Build the engine on the client only

If you drop down to the core `new FilePicker(...)` directly, construct it inside an effect / mount
hook  **never at module scope**, where it would run on the server and throw:

::: code-group

```tsx [React]
import { useEffect, useRef } from 'react'
import { FilePicker } from '@anil-labs/file-picker-core'

function Gallery() {
  const ref = useRef<FilePicker>()
  useEffect(() => {
    const picker = new FilePicker({ adapter }) // browser-only
    ref.current = picker
    return () => picker.destroy()
  }, [])
  // …
}
```

```vue [Vue]
<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { FilePicker } from '@anil-labs/file-picker-core'

let picker: FilePicker
onMounted(() => (picker = new FilePicker({ adapter })))
onBeforeUnmount(() => picker?.destroy())
</script>
```

```svelte [Svelte]
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { FilePicker } from '@anil-labs/file-picker-core'

  let picker: FilePicker
  onMount(() => (picker = new FilePicker({ adapter })))
  onDestroy(() => picker?.destroy())
</script>
```

```tsx [Solid]
import { onMount, onCleanup } from 'solid-js'
import { FilePicker } from '@anil-labs/file-picker-core'

function Gallery() {
  let picker: FilePicker
  onMount(() => (picker = new FilePicker({ adapter })))
  onCleanup(() => picker?.destroy())
}
```

:::

::: tip
This is exactly what the [framework bindings](/frameworks/react) do for you  reach for them first
and you rarely need to touch the raw constructor.
:::

## The web component needs the browser

Importing `@anil-labs/file-picker-element` calls `customElements.define`, which only exists in the
browser. Import it at module scope and SSR breaks. Either **dynamic-import it on the client** (inside
`onMounted` / `useEffect` / `onMount`) or guard the import with `typeof window`:

```ts
if (typeof window !== 'undefined') {
  await import('@anil-labs/file-picker-element')
}
```

## Only `theme` and `selected` are reactive after mount

Once the engine is built, the framework bindings keep only **`theme`** and **`selected`** in sync
with your props. Every other option (`adapter`, `multiple`, `typeFilters`, `labels`, `layout`, …) is
read once at construction. To apply a changed option, **remount** the component  for example by
giving it a new React `key`.

## Framework notes

### Next.js (App Router)

The React binding ships a `'use client'` banner, so `<FilePicker>` works in Server Component setups
out of the box  render it directly and import the core CSS in your root layout. For the web
component, dynamic-import it from a client component's `useEffect`, or wrap that component with
`next/dynamic` using `{ ssr: false }`.

```tsx
'use client'
import { useEffect } from 'react'

export function Picker() {
  useEffect(() => {
    import('@anil-labs/file-picker-element') // registers <file-picker> client-side
  }, [])
  return <file-picker /* attributes… */ />
}
```

### Nuxt

Use the Vue binding  `<FilePicker>` builds the engine on mount, so it hydrates cleanly. Add the CSS
via `nuxt.config` (`css: ['@anil-labs/file-picker-core/styles.css']`) or an `app.vue` import. For the
web component, import it inside `onMounted` or wrap `<file-picker>` in `<ClientOnly>`, and register
the tag so the compiler doesn't warn:

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  vue: { compilerOptions: { isCustomElement: (tag) => tag === 'file-picker' } },
})
```

### SvelteKit

`createFilePicker` constructs the engine immediately, so call it inside `onMount` and tear it down in
`onDestroy`  exactly as the [Svelte guide](/frameworks/svelte) shows. That keeps it off the server.
Import the CSS in your root `+layout.svelte`, and dynamic-import `@anil-labs/file-picker-element`
inside `onMount` if you use the web component.

### SolidStart

The Solid binding's `<FilePicker>` and `useFilePicker` build on mount, so they render normally. Guard
any direct engine construction or web-component import with `onMount`, or with `isServer` from
`solid-js/web`:

```tsx
import { isServer } from 'solid-js/web'

if (!isServer) {
  await import('@anil-labs/file-picker-element')
}
```
