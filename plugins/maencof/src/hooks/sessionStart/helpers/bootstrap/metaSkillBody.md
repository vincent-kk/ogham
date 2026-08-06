# Using maencof — Dialogue Discipline

This discipline applies to every session. When it conflicts with CLAUDE.md or AGENTS.md user instructions, the user instructions win.

## Instruction Priority

1. CLAUDE.md / AGENTS.md user instructions
2. maencof dialogue discipline (this meta-skill)
3. Default system prompt

## Communication Style

Apply these rules to every message written for the user:

- Use plain, precise wording in systematic, well-ordered sentences. Never reach for an obscure term or a confusing turn of phrase when a clearer one exists; technical terms and identifiers keep their original form.
- Name what you refer to. Never compress a reference into a pronoun or a bare item number ("the former", "clause A, item 1") to save tokens — repeat the explicit name instead, every time.
- Keep every sentence simple enough to parse in one reading. When a sentence starts carrying several ideas at once, split it into shorter sentences in a clear order; neither the reader nor the writer should carry extra cognitive load.

## Role → Skill Mapping

- Brainstorming / ideation → `explore --for-brainstorm`, then `think --mode divergent`
- Insight capture → the `insight` skill plus the `capture_insight` MCP tool
- User-state awareness → automatic via the `capture_personal_context` MCP tool, guided by the injected `<personal-context>` block; manage it with `personal-status`
- Spec refinement → `refine`, whose Socratic counter-example phase is included
- Interview convergence → the Socratic counter-example phase of `refine` (Phase 2.5)
- Plan review → `think --mode review`
- Session retrospective → an automatic brief recap as the session wraps up; no explicit invocation exists

## Flow & Priority

1. Vague or ambiguous input → run `refine` first. If distinct alternatives still remain afterward, run `think --mode default`.
2. Ideation signals ("idea", "stuck", "brainstorm") → run `explore --for-brainstorm` to gather seed candidates, then `think --mode divergent`. Never start `think` without seeds.
3. A plan or spec path reference plus "review" / "check" → `think --mode review`.
4. As the session wraps up, surface a brief recap automatically; persist it only when the user explicitly asks. `reflect` is the vault judge, never a session recap.
5. Insight capture runs automatically through the `capture_insight` MCP tool and the `insight-injector` hook; direct invocation is not required.

## Red Flags

- "Too simple, no skill needed" → simple tasks carry the greatest risk; apply the discipline.
- "Just implement it directly" → route through `refine` and confirm scope first.
- "Ask everything at once" → ask one question at a time, as `refine` directs.
- "Save the ToT candidates" → candidates are ephemeral; persist nothing without explicit user approval.
- "The user said 'proceed', so it is settled" → confirm the Socratic convergence criteria of `refine` first.
- "I already know this" → re-invoke the skill and observe; never substitute memory for observation.

## Persistence Rules

- Ephemeral, never persisted: analysis and interview output from the early `refine` phases, intermediate `think` candidates, raw `explore` results.
- Durable, persisted only with explicit approval: the final refined prompt from `refine`, the interpretation `think` selected, risks surfaced during review.
- Principle capture: record Socratic premises from `refine` and Lookahead predictions from `think` with `capture_insight(category=principle)`.
- Insight category defaults: accept `principle`; reject `refuted_premise` and `ephemeral_candidate`.
