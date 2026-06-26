# search — intent classification

Classify the request deterministically before entering the state machine.
`IntentType` ∈ `FULL_SEARCH · QUERY_ONLY · DOWNLOAD · NEEDS_CLARIFICATION`.

| intent                | Signals                                                                | Route                             |
| --------------------- | ---------------------------------------------------------------------- | --------------------------------- |
| `FULL_SEARCH`         | a topic/question + "find / search / papers / review" + expects records | full pipeline ①②③                 |
| `QUERY_ONLY`          | "just the query", "make a PubMed query", no intent to run it           | `query` skill → ① only            |
| `DOWNLOAD`            | PMID/PMCID/DOI given + "PDF / full text / download"                    | `download` skill → fetch-fulltext |
| `NEEDS_CLARIFICATION` | topic vague, scope unclear, db undecided                               | ask the user                      |

## Heuristics

- Bare ID list (PMID/PMCID) with a fetch verb → `DOWNLOAD`.
- "query / 검색식 / 쿼리만" without "find/search results" → `QUERY_ONLY`.
- A research topic in natural language → `FULL_SEARCH` (the default for substantive asks).
- Ambiguous breadth (e.g. one vague word, no field/scope) → `NEEDS_CLARIFICATION`;
  ask for topic facets, date range, and db before generating queries.

Flags override only execution mode, not intent: `--auto` keeps `FULL_SEARCH` but
runs unattended; `--db` / `--date` bind context. See
[modes.md](modes.md) and [state-machine.md](state-machine.md).
