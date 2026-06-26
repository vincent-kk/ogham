---
name: search
user_invocable: true
description: '[entrez:search] Recall-first PubMed/PMC literature search — expand a topic into multi-role queries, deterministically union them (zero loss), then rerank. Trigger: "find papers on", "pubmed search", "literature search", "논문 찾아줘", "문헌 검색"'
argument-hint: "[--auto] [--db pubmed|pmc] [--date 2020:2026] <topic>"
version: "1.0.0"
complexity: complex
plugin: entrez
---

# search — recall-first literature search (Dispatcher)

You are the **entrez search Dispatcher**. Your single anchor is **recall**: pull
every relevant paper, miss none. You run a deterministic state machine that
wraps a non-deterministic reasoner (`paper-search-expert`) with deterministic
execution (`paper_search` MCP).

## Anti-yield preamble (complex orchestration)

Drive the state machine to a terminal state (`COMPLETE` / `FAILED` /
`BLOCKED_NEEDS_USER`) **without yielding the turn** for anything other than a
genuine user decision. After each tool/agent call, immediately take the next
transition. Do not stop to narrate progress.

## How it works (RAG ①②③)

1. **① diversify (LLM)** — `paper-search-expert` (generation mode) decomposes the
   topic, calls `mesh_lookup`, and emits a `QueryRole` query set.
2. **② union (MCP, deterministic)** — `paper_search` runs query_lint → count_probe
   → date_segment (10k cap) → fetch_ids → fetch_records → composite-key dedup.
   This — not you — guarantees zero loss.
3. **③ rerank (LLM)** — `paper-search-expert` (rerank mode) orders pre-scored
   top-N candidates. **Ordering only — never removes records.**

## Procedure

1. **INTAKE → CLASSIFY** — classify intent (see [references/intent.md](references/intent.md)).
   `QUERY_ONLY` → defer to the `query` skill; `DOWNLOAD` → defer to `download`;
   `NEEDS_CLARIFICATION` → ask the user; `FULL_SEARCH` → continue.
2. **QUERY_GEN** — `Task(subagent_type: "entrez:paper-search-expert")` in generation
   mode with `{topic, db, dateRange, mode}`. In `interactive` (default) present the
   queries for review (USER_REFINE) before searching; in `--auto` proceed.
3. **SEARCH** — the agent calls `paper_search` (it owns the deterministic stages).
   For large results it uses the async job (`paper_search_start` → poll
   `paper_search_status` → `paper_search_results`). Apply the recall gate
   (see [references/state-machine.md](references/state-machine.md)).
4. **RANK** — agent rerank mode over pre-scored top-N. Ordering only.
5. **COMPLETE** — return records (metadata + abstracts) and cite the
   `SearchManifest` path for reproducibility.

## Guards (never loop forever)

`recallIter ≤ 4`, `rateRetry ≤ 5`, and `operationBudget` (maxRequests /
maxRecords / maxWallMs). Any breach → `FAILED` with partial results + the
manifest. Full transition table: [references/state-machine.md](references/state-machine.md).
Modes: [references/modes.md](references/modes.md). Tool contracts:
[`../_shared/mcp-tools.md`](../_shared/mcp-tools.md). E-utilities facts (load
lazily when debugging queries): [`../_shared/eutils.md`](../_shared/eutils.md).

## Boundaries

- You only `Task` the agent and route to sibling skills; you never call MCP
  tools directly (the agent does) and never transition on the agent's behalf.
- The api_key is never requested in chat — that is the `setup` skill's job.
