# Contributing

Thanks for your interest in improving **file-picker**! This is a pnpm
workspace monorepo: a framework-agnostic core engine plus thin bindings for
React, Vue, Svelte, Solid and a Web Component.

## Prerequisites

- **Node.js** ≥ 18 (the repo tracks the current LTS in CI)
- **pnpm** ≥ 9 — `corepack enable` will provide the pinned version

## Getting started

```bash
git clone https://github.com/anilkumarthakur60/file-picker.git
cd file-picker
pnpm install
```

Run a framework demo while you work:

```bash
pnpm example:react   # or :vue :svelte :solid :element :vanilla
```

## Project layout

```
packages/
  core/      # the engine — media-library UI, selection, filters, upload,
             #   folders & the FilePickerAdapter (renders its own DOM + styles.css)
  react/     # React binding (<FilePicker>, useFilePicker)
  vue/       # Vue 3 binding (<FilePicker>, useFilePicker)
  svelte/    # Svelte binding (createFilePicker + <FilePicker>)
  solid/     # Solid binding (<FilePicker>, useFilePicker)
  element/   # <file-picker> custom element
examples/     # one Vite app per binding (also the deployed demos)
docs/         # VitePress documentation site
```

Most behaviour changes belong in **`packages/core`** — the bindings are
intentionally thin wrappers.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm build` | Build all packages (ESM + CJS + IIFE + `.d.ts`) |
| `pnpm test` | Run the Vitest suite (core) |
| `pnpm typecheck` | `tsc --noEmit` across every package |
| `pnpm lint` | ESLint (type-aware on the library — **`any` is an error**) |
| `pnpm format` | Prettier write |
| `pnpm check` | lint + format:check + typecheck + test, in one shot |
| `pnpm docs:dev` | Preview the docs site locally |

Please run **`pnpm check`** before opening a PR.

## Coding standards

- **No `any`.** The library is linted with type-aware rules; use a specific
  type, or define one if it doesn't exist yet.
- Formatting is owned by Prettier — don't hand-format; run `pnpm format`.
- Match the surrounding style (no semicolons, single quotes).
- New behaviour should come with a test in `packages/core/test`.

## Changesets

Every user-facing change needs a changeset so the version bump and changelog
are generated automatically:

```bash
pnpm changeset
```

Pick the affected packages and a semver bump (patch / minor / major), and
commit the generated file in `.changeset/`. Docs-only or CI-only changes don't
need one.

## Pull requests

1. Branch off `main`.
2. Keep the change focused; add a changeset if it affects a published package.
3. Ensure `pnpm check` passes.
4. Fill in the PR template.

## Reporting bugs

Open an issue with the **Bug report** template — a minimal reproduction (a
StackBlitz/CodeSandbox or a code snippet) gets things fixed fastest.

By contributing you agree that your contributions are licensed under the
project's [MIT License](./LICENSE).
