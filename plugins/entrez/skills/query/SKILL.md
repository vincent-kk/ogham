---
name: query
user_invocable: true
description: '[entrez:query] Build a recall-oriented PubMed query set from a topic — no search is run. Trigger: "make a pubmed query", "build a search string", "검색식 만들어", "쿼리만"'
argument-hint: "[--db pubmed|pmc] <topic>"
version: "1.0.0"
complexity: moderate
plugin: entrez
---

# query — PubMed query generation (no search)

Produce a `QueryRole` query set for a topic and stop. This is stage ① only — no
`paper_search`, no records. Use it when the user wants the search strings to run
themselves elsewhere, or to preview before promoting to `search`.

## Procedure

1. `Task(subagent_type: "entrez:paper-search-expert")` in **generation mode** with
   `{topic, db, dateRange}`.
2. The agent decomposes the topic, calls `mesh_lookup` for MeSH descriptors/entry
   terms, and emits queries across roles (`ATM_BROAD`, `MESH_EXPLODED`,
   `MESH_NOEXP`, `TIAB_SYNONYM`, `ALL_FIELDS`, optional `SIMILAR`).
3. Return each query with its `role`, `breadth`, rationale, and (when available)
   the expected PubMed `QueryTranslation`. Do **not** call `paper_search`.

## Notes

- Methodology SSoT: [`query-strategy.md`](../_shared/query-strategy.md) (`_shared`).
- Field-tag pitfalls (quotes/wildcards reduce recall): [`../_shared/eutils.md`](../_shared/eutils.md).
- To actually run the queries and get records, use the `search` skill.
