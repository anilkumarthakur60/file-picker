<script setup lang="ts">
import { computed, ref } from 'vue'
import { FilePicker } from '@anil-labs/file-picker-vue'
import type { MediaItem } from '@anil-labs/file-picker-core'
import { createDemoAdapter } from './seed'

const adapter = createDemoAdapter()

interface LogEntry {
  id: number
  kind: string
  detail: string
}

const log = ref<LogEntry[]>([])
let nextId = 0

const names = (items: MediaItem[]): string => items.map((m) => m.filename).join(', ') || '(none)'

const push = (kind: string, detail: string): void => {
  log.value = [{ id: nextId++, kind, detail }, ...log.value].slice(0, 40)
}

const onChange = (items: MediaItem[]): void => {
  push('change', `${items.length} selected — ${names(items)}`)
}

const onSelect = (items: MediaItem[]): void => {
  push('select ✓', `confirmed ${items.length} — ${names(items)}`)
}

const onUpload = (items: MediaItem[]): void => {
  push('upload', `${items.length} file(s) — ${names(items)}`)
}

// --- form integration ------------------------------------------------------

// The picker is not an <input>, so it contributes nothing to a form on its own.
// Mirroring the selection into hidden inputs is all it takes — this prints the
// JSON a backend parses that FormData into, so you can see what arrives.
const payload = ref<string | null>(null)

const formData = ref({
  // Seeded here, not with a `value` attribute on the input — v-model wins over
  // `value`, so the markup default would silently never appear.
  name: 'Summer campaign',
  description: '',
  media_ids: [] as number[],
})

const selected = ref<MediaItem[]>([])

// `v-model` on <FilePicker> carries MediaItem[], not ids — ids are a lossy
// projection and nothing can rebuild items from them. A writable computed keeps
// both in step: the items drive the picker, the ids drive the form.
const mediaModel = computed({
  get: () => selected.value,
  set: (items: MediaItem[]) => {
    selected.value = items
    formData.value.media_ids = items.map((i) => Number(i.id))
  },
})

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

const onSubmit = (event: Event): void => {
  // A real app would let this submit (or post it with fetch); the demo just
  // shows the payload instead of navigating away.
  event.preventDefault()
  payload.value = describeSubmission(event.target as HTMLFormElement)
}
</script>

<template>
  <main class="page">
    <div class="hero">
      <span class="badge">Vue · &lt;FilePicker&gt;</span>
      <h1>@anil-labs/file-picker</h1>
      <p class="tag">
        A framework-agnostic media library — folders, upload, filters, editing and single/multi
        selection. This demo runs entirely in-memory (no backend).
      </p>
    </div>

    <div class="panel">
      <FilePicker
        :options="{ adapter, multiple: true, title: 'Media Library' }"
        label="Choose media"
        @change="onChange"
        @select="onSelect"
        @upload="onUpload"
      />
    </div>

    <section class="log-wrap">
      <h2>Events</h2>
      <div class="log">
        <div v-if="log.length === 0" class="empty">Open the picker and select, upload or edit…</div>
        <div v-for="entry in log" :key="entry.id" class="log-row">
          <span class="k">{{ entry.kind }}</span> {{ entry.detail }}
        </div>
      </div>
    </section>

    <section class="form-wrap">
      <h2>As a form field</h2>
      <form class="form" @submit="onSubmit">
        <label class="field">
          <span>Title</span>
          <input name="title" v-model="formData.name" />
        </label>

        <label class="field">
          <span>Alt text</span>
          <input name="alt" placeholder="Describe the media" v-model="formData.description" />
        </label>

        <div class="field">
          <span>Media</span>
          <!-- `v-model` carries MediaItem[]; the computed behind it also writes
               formData.media_ids, so the ids you post stay in step for free. -->
          <FilePicker
            v-model="mediaModel"
            :options="{ adapter, multiple: true, title: 'Attach media' }"
            label="Attach media"
          />
          <!-- One hidden input per selected id — `mediaIds[]` arrives as an
               array in PHP/Laravel/Rails; use `mediaIds` for a repeated key. -->
          <input
            v-for="id in formData.media_ids"
            :key="id"
            type="hidden"
            name="mediaIds[]"
            :value="String(id)"
          />
          <p class="hint">
            <code>formData.media_ids</code> = [{{ formData.media_ids.join(', ') }}] —
            {{ formData.media_ids.length }} hidden <code>mediaIds[]</code> input{{
              formData.media_ids.length === 1 ? '' : 's'
            }}. The trigger is a <code>type="button"</code>, so opening the picker never submits the
            form.
          </p>
        </div>

        <button class="submit" type="submit">Submit</button>
      </form>

      <h2>What the server receives</h2>
      <pre class="payload">{{
        payload ?? 'Submit the form to see the FormData it would post…'
      }}</pre>
    </section>

    <footer>
      The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.
      <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
    </footer>
  </main>
</template>
