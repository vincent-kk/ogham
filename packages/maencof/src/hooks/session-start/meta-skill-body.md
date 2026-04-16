# Using maencof — Dialogue Discipline

**This discipline must be observed during every session.** If it conflicts with user instructions in CLAUDE.md / AGENTS.md, the user instructions take precedence.

## 1. Instruction Priority

1. CLAUDE.md / AGENTS.md user instructions
2. maencof dialogue discipline (this meta-skill)
3. Default system prompt

## 2. 6 Role → Skill Mapping

| Role | Skill |
|---|---|
| Brainstorming / ideation | `maencof-explore --for-brainstorm` → `maencof-think --mode divergent` |
| Insight capture management | `maencof-insight` + `capture_insight` MCP tool |
| Spec refinement | `maencof-refine` (Phase 2.5 Socratic included) |
| Interview convergence | `maencof-refine` Phase 2.5 |
| Plan review | `maencof-think --mode review` |
| Session retrospective | SessionEnd hook automatic recap (no explicit invocation) |

## 3. Invocation Rule

- Vague input → `maencof-refine` first.
- Multiple interpretations → `maencof-think --mode default`.
- Ideation signals ("idea", "stuck", "brainstorm") → `explore --for-brainstorm` → `think --mode divergent`.
- Plan/spec path ref + "review"/"check" → `think --mode review`.
- Session termination → SessionEnd recap surfaces automatically. Persist only when the user explicitly requests it.
- Auto-insight is observed by `capture_insight` + `insight-injector`. Direct invocation not required.

## 4. Priority Rules

1. Ambiguous → refine first. If alternatives remain, then think.
2. Insufficient seed before think → run explore beforehand.
3. Termination → SessionEnd recap path (reflect is reserved for the vault judge).
4. Insight classification → `insight.category_filter` (principle defaults to accept; refuted_premise / ephemeral_candidate default to reject).

## 5. Red Flags

| Rationalization | Correction |
|---|---|
| "Too simple, skill not needed" | Simple tasks carry the greatest risk — apply discipline |
| "Just implement directly" | Route through refine; confirm scope first |
| "Ask everything at once" | One question at a time (Prime Directive 2) |
| "Save ToT candidates" | Ephemeral — do NOT persist (explicit approval only) |
| "User said 'proceed' so OK" | Verify Phase 2.5 convergence criteria |
| "I already know this" | Re-invoke — observe rather than rely on memory |

## 6. Off-switch

- env `MAENCOF_DISABLE_DIALOGUE=1` → SessionStart emit skipped.
- `.maencof-meta/dialogue-config.json::injection.enabled=false` → same skip.
- When off, the meta-skill body becomes completely invisible (discovery loss accepted).

## 7. Vault Write Boundaries

- E (ephemeral): refine Phase 1/2, think intermediate candidates, explore results → do NOT persist.
- D (durable): refine Phase 4, think selected interpretation (explicit approval), review risks.
- P (principle): Phase 2.5 premises, Lookahead principles → `capture_insight(category=principle)`.
