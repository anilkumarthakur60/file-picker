import { useState } from 'react'
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

export default function App() {
  const [log, setLog] = useState<LogEntry[]>([])

  const push = (kind: string, detail: string): void => {
    setLog((prev) => [{ id: nextId++, kind, detail }, ...prev].slice(0, 40))
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

      <footer>
        The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.{' '}
        <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
      </footer>
    </main>
  )
}
