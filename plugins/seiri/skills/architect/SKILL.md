---
name: architect
user-invocable: true
description: 'Architect a substantial software initiative and preserve the requirements, system views, and decisions needed to sustain it. Use for durable design work such as PRDs, C4 diagrams, and ADRs; skip routine implementation and short-lived planning.'
argument-hint: '<initiative or architecture question>'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# architect — make consequential system decisions explicit and durable

Create only the architecture records the initiative needs.

- Ground the work in the repository's current state, existing constraints, and the user's goals. Distinguish observed reality, proposals, accepted decisions, and open questions.
- Treat PRDs, C4 views, ADRs, and similar records as distinct lenses, not a mandatory set. Use the lightest combination that makes the architecture understandable and consequential decisions reviewable.
- Preserve each record's purpose without prescribing a fixed format or allowing one artifact to silently stand in for another.
- Record material rationale, tradeoffs, assumptions, risks, and reversibility. Do not manufacture alternatives or certainty, and do not freeze incidental implementation detail as architecture.
- Follow the repository's existing locations, notation, and status conventions. Update established records instead of duplicating their claims, and keep related records consistent.
- Leave the result self-contained enough for another session to continue without this conversation. Surface contradictions and decisions that still require the user.
- Stay at the architecture level: do not decompose implementation tasks, prescribe exact code edits, begin implementation, or enforce structural rules owned by repository architecture tooling.
- Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.
