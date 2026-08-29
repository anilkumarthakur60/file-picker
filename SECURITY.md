# Security Policy

## Supported versions

This project is pre-1.0. Security fixes are released against the **latest**
published version of each `@anil-labs/file-picker-*` package. Please make
sure you are on the newest release before reporting.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately instead:

- Preferred: [open a private security advisory](https://github.com/anilkumarthakur60/file-picker/security/advisories/new)
  on GitHub, or
- Email **anilkumarthakur60@gmail.com** with the details.

Please include:

- the affected package and version,
- a description of the issue and its impact,
- and steps (or a proof of concept) to reproduce it.

You can expect an acknowledgement within a few days. Once a fix is ready, a
patched release will be published and the advisory disclosed, crediting you
unless you prefer to remain anonymous.

## Scope

This is a client-side UI library with **zero runtime dependencies**. The most
relevant class of issue is DOM/HTML injection  note in particular that
`captionHTML: true` and `type: 'html'` items render **trusted** content
verbatim by design; passing untrusted strings there is an application-level
concern, not a library vulnerability.
