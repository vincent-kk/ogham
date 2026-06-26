# E-utilities facts (lazy reference)

Load only when designing/linting queries or debugging the `SEARCH` stages. SSoT
for db/field/constraint facts. The deterministic service (`paper-search` +
`core/httpClient`) enforces all hard rules — this is background, not action.

## Databases (single family)

`pubmed` (citations), `pmc` (full text / OA), `mesh` (controlled vocabulary).
Single host: `eutils.ncbi.nlm.nih.gov`. Non-NCBI sources are sibling plugins.

## Field tags (recall-relevant)

- `[mh]` MeSH term, explosion ON (includes narrower terms) — broad.
- `[mh:noexp]` MeSH, explosion OFF — narrow/verification.
- `[tiab]` title/abstract word — catches not-yet-indexed recent papers.
- `[tw]` text word, `[ti]` title, `[ab]` abstract, `[all]` all fields.
- ⚠️ Quotes (`"…"`) disable Automatic Term Mapping; wildcards (`*`) disable
  ATM/explosion. Both **reduce recall** — avoid in broad roles.

## 🔴 Hard constraints (enforced by code)

- **10,000 UID cap** per query: `Count>10000` → date segmentation (dp/edat/crdt)
  retrieves every UID.
- **EFetch GET 414** → auto-POST when ids >~200 or URL >2000 chars.
- **History `WebEnv` ~1h expiry** → reproducibility uses the fetched-PMID
  checksum as the primary anchor.
- **Rate limit**: 3 req/s without an api_key, 10 req/s with — `tool`+`email`
  required on every request; 429 → backoff (`rateRetry ≤ 5`).
- **`retmax` always explicit** (never rely on the default of 20).
- **Heavy jobs**: prefer US Eastern 21:00–05:00 or weekends (NCBI guidance).

## Date types

`datetype`: `pdat` (publication), `edat` (Entrez), `mdat` (modification). For
segmentation, the field tags `[dp]`/`[edat]`/`[crdt]` bound buckets within the
query term.
