<script setup lang="ts">
import { ref } from 'vue'
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

    <footer>
      The same <code>@anil-labs/file-picker-core</code> engine powers every framework binding.
      <a href="https://github.com/anilkumarthakur60/file-picker">View source on GitHub</a>
    </footer>
  </main>
</template>
