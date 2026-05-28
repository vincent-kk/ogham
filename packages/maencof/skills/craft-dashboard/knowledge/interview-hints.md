# Interview Hints (Prepended to refine)

This file is the **entire domain knowledge** that craft-dashboard injects into the refine interview at Phase 1. Edit this file to evolve the interview questions — no skill code changes required.

The block below is wrapped as `[dashboard interview hints]` and given to refine alongside the user's original request.

---

## Goal of the Interview

Produce a refined dashboard spec that names:

1. **Data domains** — which vault content to surface
2. **Dimensions** — how to slice / aggregate / visualize it
3. **Insight goals** — what decision the user wants to support
4. **Search needs** — how the user will find specific notes

Stop when those four are unambiguous. Default to 5–7 questions total, hard cap 7 (matches `refine-protocol.md` for CREATE).

---

## Probe Order (one question at a time)

Refine should walk these dimensions in order. Skip a dimension if the user's initial input already answers it.

### A. Data Domain

Probe for:

- **Layer scope**: L1 / L2 / L3 / L4 / L5 / all (multi-select OK)
- **Sub-layer** for L3 (relational, structural, topical) or L5 (buffer, boundary) — if relevant
- **Time field**: `frontmatter.created`, `frontmatter.updated`, `frontmatter.expires`, file mtime
- **Entity filter**: by tag, by `mentioned_persons`, by `person_ref`, by path glob
- **Body content**: wikilinks (graph data), headings, task checkboxes, frontmatter custom fields

Suggested question template:

> "Which layer(s) should this draw from — all five, or a specific subset?"

### B. Dimension / Visualization

Probe for the _axis_ the user is mentally using:

| User words                               | Likely dimension   | Default chart             |
| ---------------------------------------- | ------------------ | ------------------------- |
| "over time", "trend", "추이"             | time series        | line / area / stacked bar |
| "distribution", "분포", "어떤 게 많은지" | category frequency | bar / treemap / pie       |
| "ranking", "top N", "순위"               | ordered list       | table / horizontal bar    |
| "network", "관계", "links"               | graph              | force / sankey            |
| "correlation", "vs", "교차"              | scatter            | scatter / hexbin          |
| "calendar", "heatmap", "활동"            | calendar           | calendar heatmap          |
| "candle", "min/max/median"               | range              | candlestick / box         |

Suggested question template:

> "Time series, distribution, ranking, network, or correlation — which best matches?"

### C. Insight Goal

Probe the _decision_ not just the _data_:

- "Find unloved popular topics → write concepts"
- "Check daily expiring actions"
- "See if I'm active in L4 or just L5"
- "Discover surprising connections"

This shapes annotations (thresholds, color rules, highlight filters).

Suggested question template:

> "What decision will this dashboard help you make?"

### D. Search

Probe whether search is needed at all, then how:

- **lexical (title)** — Obsidian-style prefix/fuzzy match
- **tag (exact)** — `#ai`, `#prj-foo`
- **backlinks** — "who links to this?"
- **semantic** — Spreading Activation, expensive but rich

Suggested question template:

> "Do you need search inside this dashboard? If yes — Obsidian-style title/tag, or semantic 'related notes' too?"

---

## Hidden Dimensions to Surface (Socratic 2.5)

When the user's stated goal is clear, refine's Phase 2.5 should probe these implicit assumptions:

- **Refresh expectation**: live (SSE) or manual reload? (Default live.)
- **Data scope**: current snapshot or include archived / expired docs?
- **Layer 5 buffer**: ephemeral docs — show or hide?
- **Empty state**: what happens before there's data?
- **Multi-vault**: one vault or aggregate multiple? (Usually one.)

Surface only the dimensions the user has not addressed. Do not ask all 5 by default.

---

## Output Shape (refine writes this)

When refine emits its Phase 3 "Refined Prompt", craft-dashboard expects a structure roughly like:

```markdown
## Refined Prompt

### Data

- Layer: L4 only
- Time field: frontmatter.expires
- Filter: expires within 14 days, status != 'done'

### Dimensions

- Primary: ranked list by days_left ascending
- Secondary: bull/bear trigger checklist nested per row

### Insight Goal

- Daily morning check: which decisions need action today

### Search

- Lexical title + tag, no semantic needed

### Optional: Annotations

- Highlight days_left <= 3 in red
- Show "expired" warning badge for negative days_left
```

This shape (markdown headings) makes Phase 3 spec transform deterministic.

---

## Anti-patterns refine should resist

- **Over-specifying colors**: design tokens come from the user's environment, not the spec
- **Asking about React components by name**: stay at the dimension level
- **Suggesting libraries**: stack is already chosen (Recharts default)
- **Asking 10+ questions**: cap at 7

---

## Defaults craft-dashboard will apply when the spec is silent

| Field                   | Default                              |
| ----------------------- | ------------------------------------ |
| Refresh                 | SSE live                             |
| Window for time series  | 30 days                              |
| Top N for distributions | 20                                   |
| Search modes            | lexical + tag                        |
| Layout                  | bento `col-6` for each panel         |
| Empty state             | "No data yet — start writing notes." |

State these defaults in the Phase 3 spec preview so the user can override before scaffolding.
