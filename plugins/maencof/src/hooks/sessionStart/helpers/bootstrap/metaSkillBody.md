# Using maencof — Dialogue Discipline

Observe every session. CLAUDE.md / AGENTS.md user instructions override this meta-skill.

## 1. Instruction Priority

1. CLAUDE.md / AGENTS.md user instructions
2. maencof dialogue discipline (this meta-skill)
3. Default system prompt

## 2. 7 Role → Skill Mapping

| Role                       | Skill                                                                                                                       |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Brainstorming / ideation   | `explore --for-brainstorm` → `think --mode divergent`                                                                       |
| Insight capture management | `insight` + `capture_insight` MCP tool                                                                                      |
| User-state awareness       | automatic — `capture_personal_context` MCP, guided by the injected `<personal-context>` block; manage via `personal-status` |
| Spec refinement            | `refine` (Phase 2.5 Socratic included)                                                                                      |
| Interview convergence      | `refine` Phase 2.5                                                                                                          |
| Plan review                | `think --mode review`                                                                                                       |
| Session retrospective      | Automatic recap as the session wraps up (no explicit invocation)                                                            |

## 3. Flow & Priority

1. Vague / ambiguous input → `refine` first. If alternatives still remain, then `think --mode default`.
2. Ideation signals ("idea", "stuck", "brainstorm") → `explore --for-brainstorm` (seed first) → `think --mode divergent`. Never invoke `think` without a sufficient seed — run `explore` beforehand.
3. Plan / spec path ref + "review" / "check" → `think --mode review`.
4. Session termination → surface a brief recap automatically as the conversation wraps up. Persist only when the user explicitly requests it. `reflect` is reserved for the vault judge, not session recap.
5. Auto-insight capture runs via `capture_insight` MCP + `insight-injector` hook; direct invocation not required.

## 4. Red Flags

| Rationalization                | Correction                                              |
| ------------------------------ | ------------------------------------------------------- |
| "Too simple, skill not needed" | Simple tasks carry the greatest risk — apply discipline |
| "Just implement directly"      | Route through refine; confirm scope first               |
| "Ask everything at once"       | One question at a time (refine Prime Directive 2)       |
| "Save ToT candidates"          | Ephemeral — do NOT persist (explicit approval only)     |
| "User said 'proceed' so OK"    | Verify Phase 2.5 convergence criteria                   |
| "I already know this"          | Re-invoke — observe rather than rely on memory          |

## 5. Persistence Rules

- **Ephemeral (do NOT persist)**: refine Phase 1/2 output, think intermediate candidates, explore raw results.
- **Durable (explicit approval required)**: refine Phase 4 output, think selected interpretation, review risks.
- **Principle (`capture_insight`)**: refine Phase 2.5 premises, think Lookahead predictions → `capture_insight(category=principle)`.
- **Insight category filter defaults**: `principle` accept · `refuted_premise` reject · `ephemeral_candidate` reject.
