---
'@anil-labs/file-picker-core': minor
---

Fix two `createRestAdapter` defaults found by running it against a real Laravel
`fast-api-crud` v3 backend.

**Scope filters now travel as one JSON `filters` param.** The default previously sent
them flat — `?queryFilter=cat&folderFilter=5` — but the backend reads them from
`?filters={"queryFilter":"cat"}` (`HasCrudOperations::requestFilters()` json_decodes that
key). Unknown top-level params are not errors, so search, type and folder filtering all
returned the *full unfiltered list* while appearing to work. Override `toListParams` if
your API expects the flat shape.

**A message-only upload response no longer yields a phantom item.** APIs that answer
`POST` with `{"data":{"message":"…"}}` instead of the created rows fell into the
single-object fallback and mapped to one `MediaItem` with an empty id — which reached the
`upload` event and made the "N files uploaded" toast report 1 regardless of how many files
were sent. Rows without a usable id are now dropped, so such a response returns `[]`; the
picker refetches the grid either way.
