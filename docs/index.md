---
layout: home

hero:
  name: "@anil-labs/file-picker"
  text: "A media-library file picker for any framework"
  tagline: Folders, upload, filters, metadata editing and single/multi selection  one engine, a pluggable backend adapter, and bindings for React, Vue, Svelte, Solid and a Web Component.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Adapters
      link: /guide/adapters
    - theme: alt
      text: Live Demos
      link: https://anil-labs-file-picker.vercel.app

features:
  - icon: 🔌
    title: Backend-agnostic
    details: The picker never talks to your API directly. Implement one small FilePickerAdapter, or drop in the built-in REST or in-memory adapter.
  - icon: 🗂️
    title: Folders, upload & editing
    details: Browse, create, rename and delete folders. Upload by click or drag & drop. Edit filename, alt text, tags and folder  saved per field.
  - icon: ✅
    title: Single & multi selection
    details: Toggle single or multiple selection, with shift-click range selection and a live selected-thumbnails strip.
  - icon: 🧩
    title: Five bindings + Web Component
    details: React, Vue, Svelte and Solid wrappers, a framework-free <file-picker> custom element, and the raw core  all over one engine.
  - icon: 🎨
    title: Its own themeable UI
    details: One styles.css renders the whole dialog. Light / dark / auto theming through --fp-* CSS variables. The core has zero runtime dependencies.
  - icon: 🎯
    title: Typed, zero-any
    details: Written in strict TypeScript with fully-typed options, events and adapter contract  no any in the public API.
---
