import { useState, type FormEvent } from 'react'
import { FilePicker } from '@anil-labs/file-picker-react'
import type { MediaItem } from '@anil-labs/file-picker-core'
import { createDemoAdapter } from './seed'

const adapter = createDemoAdapter()

interface LogEntry {
  id: number
  kind: string
  detail: string
}

const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

let nextId = 0

// The picker is not an <input>, so it contributes nothing to a form on its own.
// Mirroring the selection into hidden inputs is all it takes — this prints the
// exact FormData the browser would post so you can see what arrives server-side.
const describeSubmission = (form: HTMLFormElement): string => {
  const entries = [...new FormData(form).entries()]
  const width = Math.max(...entries.map(([key]) => key.length), 0)
  const lines = entries.map(
    ([key, value]) => `${key.padEnd(width)} = ${String(value) || '(empty)'}`,
  )
  if (!entries.some(([key]) => key === 'mediaIds[]')) {
    lines.push('', '(no mediaIds[] field at all — nothing is selected)')
  }
  return [`POST /api/posts — ${entries.length} field(s)`, '', ...lines].join('\n')
}

export default function App() {
  const [log, setLog] = useState<LogEntry[]>([])
  const [selected, setSelected] = useState<MediaItem[]>([])
  const [payload, setPayload] = useState<string | null>(null)

  const push = (kind: string, detail: string): void => {
    setLog((prev) => [{ id: nextId++, kind, detail }, ...prev].slice(0, 40))
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    // A real app would let this submit (or post it with fetch); the demo just
    // shows the payload instead of navigating away.
    event.preventDefault()
    setPayload(describeSubmission(event.currentTarget))
  }

  return (
    <main className="page">
      <div className="hero">
        <span className="badge">{'React · <FilePicker>'}</span>
        <h1>@anil-labs/file-picker</h1>
        <p className="tag">
          A framework-agnostic media library — folders, upload, filters, editing and single/multi
          selection. This demo runs entirely in-memory (no backend).
        </p>
      </div>

      <div className="panel">
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

      <section className="log-wrap">
        <h2>Events</h2>
        <div className="log">
          {log.length === 0 ? (
            <div className="empty">Open the picker and select, upload or edit…</div>
          ) : (
            log.map((entry) => (
              <div className="log-row" key={entry.id}>
                <span className="k">{entry.kind}</span> {entry.detail}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="form-wrap">
        <h2>As a form field</h2>
        <form className="form" onSubmit={onSubmit}>
          <label className="field">
            <span>Title</span>
            <input name="title" defaultValue="Summer campaign" />
          </label>

          <label className="field">
            <span>Alt text</span>
            <input name="alt" placeholder="Describe the media" />
          </label>

          <div className="field">
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
            {selected.map((item) => (
              <input key={item.id} type="hidden" name="mediaIds[]" value={String(item.id)} />
            ))}
            <p className="hint">
              {selected.length} hidden <code>mediaIds[]</code> input
              {selected.length === 1 ? '' : 's'} — the trigger is a{' '}
              <code>type=&quot;button&quot;</code>, so opening the picker never submits the form.
            </p>
          </div>

          <button className="submit" type="submit">
            Submit
          </button>
        </form>

        <h2>What the server receives</h2>
        <pre className="payload">
          {payload ?? 'Submit the form to see the FormData it would post…'}
        </pre>
      </section>

      <footer>
        The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.{' '}
        <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
      </footer>
    </main>
  )
}
