import { createSignal, For, Show } from 'solid-js'
import { FilePicker } from '@anil-labs/file-picker-solid'
import type { MediaItem } from '@anil-labs/file-picker-core'
import { createDemoAdapter } from './seed'

type LogEntry = { kind: string; detail: string }

const adapter = createDemoAdapter()

const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

export default function App() {
  const [log, setLog] = createSignal<LogEntry[]>([])

  const push = (kind: string, detail: string): void => {
    setLog((prev) => [{ kind, detail }, ...prev].slice(0, 40))
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

      <footer>
        The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.{' '}
        <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
      </footer>
    </main>
  )
}
