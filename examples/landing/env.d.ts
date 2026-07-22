// Side-effect stylesheet imports have no type declarations.
declare module '*.css'

// Injected by `define` in vite.config.ts — see the comment there for why the
// version is read from packages/core rather than written into the markup.
declare const __PKG_VERSION__: string
