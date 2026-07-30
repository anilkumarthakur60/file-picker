import { createSignal, For, Show } from 'solid-js'
import { FilePicker } from '@anil-labs/file-picker-solid'
import type { MediaItem } from '@anil-labs/file-picker-core'
import { createDemoAdapter } from './seed'

type LogEntry = { kind: string; detail: string }

const adapter = createDemoAdapter()

const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

// The picker is not an <input>, so it contributes nothing to a form on its own.
// Mirroring the selection into hidden inputs is all it takes — this prints the
// exact FormData the browser would post so you can see what arrives server-side.
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

export default function App() {
  const [log, setLog] = createSignal<LogEntry[]>([])
  const [selected, setSelected] = createSignal<MediaItem[]>([])
  const [payload, setPayload] = createSignal<string | null>(null)

  const push = (kind: string, detail: string): void => {
    setLog((prev) => [{ kind, detail }, ...prev].slice(0, 40))
  }

  const onSubmit = (event: SubmitEvent & { currentTarget: HTMLFormElement }): void => {
    // A real app would let this submit (or post it with fetch); the demo just
    // shows the payload instead of navigating away.
    event.preventDefault()
    setPayload(describeSubmission(event.currentTarget))
  }

  return (
    <main class="page">
      <div class="hero">
        <span class="badge">SolidJS</span>
        <h1>@anil-labs/file-picker</h1>
        <p class="tag">
          A framework-agnostic media library — folders, upload, filters, editing and single/multi
          selection. This demo runs entirely in-memory (no backend).
        </p>
      </div>

      <div class="panel">
        <FilePicker
          adapter={adapter}
          multiple
          title="Media Library"
          label="Choose media"
          onChange={(items) => push('change', `${items.length} selected — ${names(items)}`)}
          onSelect={(items) => push('select ✓', `confirmed ${items.length} — ${names(items)}`)}
          onUpload={(items) => push('upload', `${items.length} file(s) — ${names(items)}`)}
        />
      </div>

      <section class="log-wrap">
        <h2>Events</h2>
        <div class="log">
          <Show
            when={log().length > 0}
            fallback={<div class="empty">Open the picker and select, upload or edit…</div>}
          >
            <For each={log()}>
              {(row) => (
                <div class="log-row">
                  <span class="k">{row.kind}</span> {row.detail}
                </div>
              )}
            </For>
          </Show>
        </div>
      </section>

      <section class="form-wrap">
        <h2>As a form field</h2>
        <form class="form" onSubmit={onSubmit}>
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
            <FilePicker
              adapter={adapter}
              multiple
              title="Attach media"
              label="Attach media"
              onChange={setSelected}
            />
            {/* One hidden input per selected item — `mediaIds[]` arrives as an
                array in PHP/Laravel/Rails; use `mediaIds` for a repeated key. */}
            <For each={selected()}>
              {(item) => <input type="hidden" name="mediaIds[]" value={String(item.id)} />}
            </For>
            <p class="hint">
              {selected().length} hidden <code>mediaIds[]</code> input
              {selected().length === 1 ? '' : 's'} — the trigger is a <code>type="button"</code>, so
              opening the picker never submits the form.
            </p>
          </div>

          <button class="submit" type="submit">
            Submit
          </button>
        </form>

        <h2>What the server receives</h2>
        <pre class="payload">
          {payload() ?? 'Submit the form to see the FormData it would post…'}
        </pre>
      </section>

      <footer>
        The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.{' '}
        <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
      </footer>
    </main>
  )
}
