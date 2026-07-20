# entrez MCP tools (contract mirror)

SSoT is the MCP server (`src/mcp/tools/*`) + design `mcp-tools.md`. This is a
lazy reference for skills/agent. Tools are exposed under the `tools` server:
call them as `mcp__plugin_entrez_tools__<name>`. All are `[Internal]` — invoked by the entrez
agent/skills, not the user directly.

## paper_search (readOnly, non-idempotent)

Deterministic union of a `QueryRole` query set. Zero loss is its contract.

- **in**: `queries[]{term, role, breadth?, rationale?, seedPmids?}` (1+), `db?`,
  `fetchMode?` (IDS_ONLY|SUMMARY|ABSTRACTS|FULL, default SUMMARY), `capStrategy?`
  (WARN|DATE_SEGMENT|ABORT, default DATE_SEGMENT), `dateRange?`, `dateField?`,
  `maxRecords?`, `batchSize?`, `sort?`, `includeQueryTranslation?`, `cursor?`.
- **out**: `per_query[]`, `union{records,total_unique,dedup_collisions}`,
  `segments[]`, `warnings[]`, `errors[]`, `partial`, `missing_pmids[]`,
  `failed_batches[]`, `reproducibility{manifestPath, fetchedPmidChecksum, …}`,
  `cursor?`.
- **async (large)**: `paper_search_start` → `paper_search_status` (poll) →
  `paper_search_results` (cursor paginated).

## mesh_lookup (readOnly, idempotent)

Map terms to MeSH. **in**: `terms[]`, `includeScopeNote?`, `includeScr?`.
**out**: `mappings[]{input, matched, descriptorName?, descriptorUi?,
treeNumbers?, entryTerms?, scopeNote?, scrMappings?}`. Called by the agent's
generation mode to inform explosion/synonym decisions.

## fetch_fulltext (write, idempotent)

PMC Open Access download. **in**: `ids[]` (PMID/PMCID), `formats?`
(PDF|XML|TAR, default PDF), `outDir?`, `overwrite?`, `extractFromTgz?`.
Missing PDF/XML links fall back to TAR; `extractFromTgz` extracts the requested
member from that package when possible. **out**:
`downloaded[]{pmcid, format, path, sha256, bytes, oaStatus, license}`,
`unavailable[]{id, reason, format?, links}`. OA + license gated: no license ⇒
link only.

## auth_check (readOnly, idempotent)

**in**: `probeEInfo?`. **out**: `{configured, reachable, hasApiKey, rateLimit,
toolEmailConfigured, dbList?}`. api_key value never returned.

## setup (write)

**in**: `{mode?: "new"|"edit"}`. **out**: `{success, url?}`. Launches the local
web UI; secrets flow browser → disk only.

> E-utilities constraints (10k cap, auto-POST, rate, History expiry) are owned by
> the deterministic service. Facts: [`eutils.md`](eutils.md).
