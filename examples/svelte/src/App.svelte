<script lang="ts">
  import { onDestroy, onMount } from 'svelte'
  import { createFilePicker } from '@anil-labs/file-picker-svelte'
  import type { FilePickerController } from '@anil-labs/file-picker-svelte'
  import type { MediaItem } from '@anil-labs/file-picker-core'
  import { createDemoAdapter } from './seed'

  type LogEntry = { kind: string; detail: string }

  // Both pickers on this page browse the same in-memory library.
  const adapter = createDemoAdapter()

  let triggerEl = $state<HTMLDivElement>()
  let selectedEl = $state<HTMLDivElement>()
  let selected = $state<MediaItem[]>([])
  let log = $state<LogEntry[]>([])

  let formTriggerEl = $state<HTMLDivElement>()
  let formSelectedEl = $state<HTMLDivElement>()
  let formSelected = $state<MediaItem[]>([])
  let payload = $state<string | null>(null)

  let controller: FilePickerController | undefined
  let formController: FilePickerController | undefined
  let unsubscribe: (() => void) | undefined
  let formUnsubscribe: (() => void) | undefined

  const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

  const push = (kind: string, detail: string): void => {
    log = [{ kind, detail }, ...log].slice(0, 40)
  }

  // The picker is not an <input>, so it contributes nothing to a form on its
  // own. Mirroring the selection into hidden inputs is all it takes — this
  // prints the exact FormData the browser would post, so you can see what
  // arrives server-side.
  const describeSubmission = (form: HTMLFormElement): string => {
    const payload: Record<string, string | string[]> = {}
    for (const [rawKey, value] of new FormData(form).entries()) {
      const repeated = rawKey.endsWith('[]')
      const key = repeated ? rawKey.slice(0, -2) : rawKey
      const text = String(value)
      if (!repeated) {
        payload[key] = text
        continue
      }
      const bucket = payload[key]
      if (Array.isArray(bucket)) bucket.push(text)
      else payload[key] = [text]
    }
    return JSON.stringify(payload, null, 2)
  }

  const onSubmit = (event: SubmitEvent): void => {
    // A real app would let this submit (or post it with fetch); the demo just
    // shows the payload instead of navigating away.
    event.preventDefault()
    payload = describeSubmission(event.currentTarget as HTMLFormElement)
  }

  onMount(() => {
    controller = createFilePicker({
      adapter,
      multiple: true,
      title: 'Media Library',
      onChange: (items) => push('change', `${items.length} selected — ${names(items)}`),
      onSelect: (items) => push('select ✓', `confirmed ${items.length} — ${names(items)}`),
      onUpload: (items) => push('upload', `${items.length} file(s) — ${names(items)}`),
    })
    // Read the selection reactively from the controller's `$selected` store.
    unsubscribe = controller.selected.subscribe((items) => (selected = items))
    // Inside onMount the engine is always built (client-only); the optional
    // chaining just satisfies the `picker: FilePickerCore | null` SSR type.
    controller.picker?.mountTrigger(triggerEl!, { label: 'Choose media' })
    controller.picker?.mountSelected(selectedEl!)

    formController = createFilePicker({ adapter, multiple: true, title: 'Attach media' })
    formUnsubscribe = formController.selected.subscribe((items) => (formSelected = items))
    formController.picker?.mountTrigger(formTriggerEl!, { label: 'Attach media' })
    formController.picker?.mountSelected(formSelectedEl!)
  })

  onDestroy(() => {
    unsubscribe?.()
    controller?.destroy()
    formUnsubscribe?.()
    formController?.destroy()
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

  <section class="form-wrap">
    <h2>As a form field</h2>
    <form class="form" onsubmit={onSubmit}>
      <label class="field">
        <span>Title</span>
        <input name="title" value="Summer campaign" />
      </label>

      <label class="field">
        <span>Alt text</span>
        <input name="alt" placeholder="Describe the media" />
      </label>

      <div class="field">
        <span>Media</span>
        <div bind:this={formTriggerEl}></div>
        <div bind:this={formSelectedEl}></div>
        <!-- One hidden input per selected item — `mediaIds[]` arrives as an
             array in PHP/Laravel/Rails; use `mediaIds` for a repeated key. -->
        {#each formSelected as item (item.id)}
          <input type="hidden" name="mediaIds[]" value={String(item.id)} />
        {/each}
        <p class="hint">
          {formSelected.length} hidden <code>mediaIds[]</code> input{formSelected.length === 1
            ? ''
            : 's'} — the trigger is a <code>type="button"</code>, so opening the picker never
          submits the form.
        </p>
      </div>

      <button class="submit" type="submit">Submit</button>
    </form>

    <h2>What the server receives</h2>
    <pre class="payload">{payload ?? 'Submit the form to see the FormData it would post…'}</pre>
  </section>

  <footer>
    The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.
    <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
  </footer>
</main>
