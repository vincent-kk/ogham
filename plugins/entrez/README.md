# entrez

NCBI E-utilities (PubMed · PMC · MeSH) academic paper search plugin for Claude Code.

> Turns Claude into an NCBI E-utilities **paper search expert**. The single anchor of the design is search **recall** — fan a natural-language topic out into diverse PubMed queries and pull back every relevant paper without missing one.

한국어 안내는 [README-ko_kr.md](./README-ko_kr.md) 참조.

## What it does

- **Recall-first search** — an LLM diversifies a topic into multi-role PubMed queries (ATM + MeSH explosion + tiab synonyms + similar articles); a deterministic MCP layer collects them exhaustively and merges with a composite-key dedup (PMID → DOI → normalized title). No record is dropped.
- **NCBI-only scope** — single host (`eutils.ncbi.nlm.nih.gov`), single db family (pubmed · pmc · mesh). Europe PMC / Crossref / Scholar are sibling plugins ("one API = one plugin").
- **Hard E-utilities rules in code, not the LLM** — 10,000 UID cap → date segmentation, EFetch GET 414 → auto-POST, rate limit (3/s no key · 10/s with key), History WebEnv ~1h expiry → PMID checksum, `retmax` always explicit.
- **Reproducible** — every search writes a `SearchManifest` (queries, translations, counts, fetched-PMID checksum) for replay and methods citation.

## Skills

| Skill      | Role                                                                         |
| ---------- | ---------------------------------------------------------------------------- |
| `search`   | Main orchestrator (Dispatcher): intent → multi-role union → rerank → records |
| `query`    | Natural language → PubMed query set only (no search)                         |
| `download` | PMID/PMCID → OA full text (PDF/XML/TAR) + non-OA links                       |
| `setup`    | Web UI configuration (`tool` · `email` · `api_key`) + reachability           |

## MCP tools

`paper_search` (+ async `paper_search_start`/`_status`/`_results`) · `mesh_lookup` · `fetch_fulltext` · `setup` · `auth_check`.

## Setup

Run the `setup` skill (or `auth_check`). A local browser form collects your NCBI
`tool` / `email` (required) and optional `api_key`. The API key is written to
`credentials.json` (0o600) and is **never** exposed to the chat or logs.

## Build

```bash
yarn entrez build       # clean → version:sync → tsc → bundle MCP server
yarn entrez test:run    # unit + e2e (fixture)
yarn entrez typecheck
```

Design canon lives in [`.metadata/entrez/`](../../.metadata/entrez/); the implementation plan in [PLAN.md](./PLAN.md).
