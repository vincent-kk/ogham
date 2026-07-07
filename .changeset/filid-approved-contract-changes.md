---
"@ogham/filid": minor
---

Approved contract changes from the 2026-07-07 behavior analysis (wave 2):

- `fractal_scan` gains `outputMode: 'full' | 'summary' | 'paths'` and a size guard: payloads over 30k chars are written to `{cacheDir}/scan-report.json` (line-structured JSON) and returned as `{ truncated: true, reportPath, summary }`. Consumer skills updated (scan uses `paths`; others document the fallback).
- PreToolUse hooks now gate on `isFcaProject` — projects that never opted into filid get no document-contract denies or structure warnings.
- Write/Edit targets are recorded as visits (`recordWriteVisit`), making the `unread-intent` map signal reachable: modules modified before their INTENT.md was read are surfaced on the next map.
- Organ-nesting warnings are creation-only and respect declared sub-fractals (INTENT.md/DETAIL.md below an organ legalises the nesting; editing existing files never warns).
- cross-review / pipeline Phase D orchestration rewritten for the current tool surface: named worker `Agent`s on the session's implicit team, `SendMessage({to})` payloads, and a `shutdown_request → TaskStop` teardown sweep replace the retired `TeamCreate` / `TeamDelete` / `Task` API.
- Heavy hook bundle budget raised 22 KB → 24 KB to absorb the gate + visit-recording logic (external-module guard unchanged).
