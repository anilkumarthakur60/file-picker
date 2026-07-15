<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { createFilePicker } from '@anil-labs/file-picker-svelte'
  import type { FilePickerController } from '@anil-labs/file-picker-svelte'
  import type { MediaItem } from '@anil-labs/file-picker-core'
  import { createDemoAdapter } from './seed'

  type LogEntry = { kind: string; detail: string }

  let triggerEl = $state<HTMLDivElement>()
  let selectedEl = $state<HTMLDivElement>()
  let selected = $state<MediaItem[]>([])
  let log = $state<LogEntry[]>([])

  let controller: FilePickerController | undefined
  let unsubscribe: (() => void) | undefined

  const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

  const push = (kind: string, detail: string): void => {
    log = [{ kind, detail }, ...log].slice(0, 40)
  }

  onMount(() => {
    controller = createFilePicker({
      adapter: createDemoAdapter(),
      multiple: true,
      title: 'Media Library',
      onChange: (items) => push('change', `${items.length} selected — ${names(items)}`),
      onSelect: (items) => push('select ✓', `confirmed ${items.length} — ${names(items)}`),
      onUpload: (items) => push('upload', `${items.length} file(s) — ${names(items)}`),
    })
    // Read the selection reactively from the controller's `$selected` store.
    unsubscribe = controller.selected.subscribe((items) => (selected = items))
    controller.picker.mountTrigger(triggerEl!, { label: 'Choose media' })
    controller.picker.mountSelected(selectedEl!)
  })

  onDestroy(() => {
    unsubscribe?.()
    controller?.destroy()
  })
</script>

<main class="page">
  <div class="hero">
    <span class="badge">Svelte 5 · runes</span>
    <h1>@anil-labs/file-picker</h1>
    <p class="tag">
      A framework-agnostic media library — folders, upload, filters, editing and single/multi
      selection. This demo runs entirely in-memory (no backend).
    </p>
  </div>

  <div class="panel">
    <div bind:this={triggerEl}></div>
    <div bind:this={selectedEl}></div>
    {#if selected.length > 0}
      <p class="tag">{selected.length} item{selected.length === 1 ? '' : 's'} selected</p>
    {/if}
  </div>

  <section class="log-wrap">
    <h2>Events</h2>
    <div class="log">
      {#if log.length === 0}
        <div class="empty">Open the picker and select, upload or edit…</div>
      {:else}
        {#each log as row}
          <div class="log-row"><span class="k">{row.kind}</span> {row.detail}</div>
        {/each}
      {/if}
    </div>
  </section>

  <footer>
    The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.
    <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
  </footer>
</main>
