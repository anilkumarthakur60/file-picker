import { defineConfig } from 'vitepress'

const REPO = 'https://github.com/anilkumarthakur60/file-picker'
const DEMOS = 'https://anil-labs-file-picker.vercel.app'

export default defineConfig({
  base: process.env.DOCS_BASE ?? '/',
  lang: 'en-US',
  title: '@anil-labs/file-picker',
  description:
    'A framework-agnostic media-library file picker  folders, upload, filters, editing and single/multi selection. One engine, a pluggable backend adapter, and bindings for React, Vue, Svelte, Solid and a Web Component.',
  cleanUrls: true,
  lastUpdated: true,
  head: [['meta', { name: 'theme-color', content: '#3b82f6' }]],
  themeConfig: {
    nav: [
      { text: 'Guide', link: '/guide/introduction' },
      { text: 'Frameworks', link: '/frameworks/vanilla' },
      { text: 'Reference', link: '/reference/api' },
      { text: 'Demos', link: DEMOS },
    ],
    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Introduction', link: '/guide/introduction' },
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Adapters', link: '/guide/adapters' },
          { text: 'Features', link: '/guide/features' },
          { text: 'Theming', link: '/guide/theming' },
          { text: 'Internationalization', link: '/guide/i18n' },
          { text: 'Server-Side Rendering', link: '/guide/ssr' },
        ],
      },
      {
        text: 'Frameworks',
        items: [
          { text: 'Vanilla / Core', link: '/frameworks/vanilla' },
          { text: 'React', link: '/frameworks/react' },
          { text: 'Vue', link: '/frameworks/vue' },
          { text: 'Svelte', link: '/frameworks/svelte' },
          { text: 'Solid', link: '/frameworks/solid' },
          { text: 'Web Component', link: '/frameworks/web-component' },
        ],
      },
      {
        text: 'Reference',
        items: [{ text: 'API', link: '/reference/api' }],
      },
    ],
    socialLinks: [{ icon: 'github', link: REPO }],
    editLink: {
      pattern: `${REPO}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 Er. Anil Kumar Thakur',
    },
  },
})
