# CLAUDE.md — @ogham/entrez

Work guide for the `@ogham/entrez` package. Package contract is [INTENT.md](./INTENT.md); source internals are [src/INTENT.md](./src/INTENT.md). Design canon is [`.metadata/entrez/`](../../.metadata/entrez/) — treat those 9 docs as the source of truth.

## Commands

```bash
yarn entrez build          # clean → version:sync → tsc → mcp-server bundle
yarn entrez build:plugin   # bundle MCP server only
yarn entrez typecheck      # type check (no emit)
yarn entrez test:run       # unit + e2e (fixture), single run (CI)
yarn entrez test           # watch
yarn entrez test:e2e       # e2e fixture scenarios
yarn entrez test:live      # live NCBI smoke (RUN_LIVE=1, opt-in)
yarn entrez version:sync   # package.json → src/version.ts + plugin.json
```

## Architecture (dispatch direction)

```
Dispatcher (search skill, state machine)
    → Agent  : paper-search-expert (generation / rerank modes)
    → Skill  : search / query / download / setup
    → MCP    : paper_search · mesh_lookup · fetch_fulltext · setup · auth_check
    → core/httpClient (retry · 429 backoff · auto-POST · SSRF allowlist)
    → NCBI E-utilities (ESearch → EFetch/ESummary/ESpell/ELink)
```

Dependency direction is one-way; lower layers never import upward.

## Hard rules (deterministic service — not the LLM)

- **10,000 UID cap** → `core/segmenter` date bucketing (dp/edat/crdt).
- **EFetch GET 414** → `core/httpClient` auto-POST (id > ~200 or URL > 2000 chars).
- **Rate limit** → 3/s without key, 10/s with key; 429 backoff, `rateRetry ≤ 5`.
- **SSRF allowlist** → eutils host only; handlers never call `fetch` directly.
- **`retmax` always explicit**; never rely on the NCBI default of 20.

## Conventions

- **FCA**: fractal split + organ isolation; every fractal has `index.ts` barrel + `INTENT.md` (Korean content, English headings, ≤ 50 lines).
- **One function per file** in `operations/` and `adapters/eutils/`.
- **No inline string literals** — all strings live in `src/types/enums.ts` (`as const`) or `src/constants/{messages,defaults,paths}.ts`.
- **No hooks.** Subprocess only via `@ogham/cross-platform`; cancellation via `AbortSignal`.
- **Secrets**: `api_key` → `credentials.json` (0o600); never in tool responses, logs, or `SearchManifest`.
- **`src/version.ts`** is generated — never edit by hand (`version:sync`).

## SSoT boundaries

Query methodology = `skills/_shared/query-strategy.md`; rerank = `skills/_shared/rerank.md`; orchestration procedure = `search` SKILL.md; tool I/O contract = MCP + `skills/_shared/mcp-tools.md`; E-utilities facts = `skills/_shared/eutils.md`. Do not duplicate. (Agent reference docs live under `skills/_shared/`, not `agents/` — the plugin loader treats every `agents/*.md` as an agent and does not allow subdirectories.)
