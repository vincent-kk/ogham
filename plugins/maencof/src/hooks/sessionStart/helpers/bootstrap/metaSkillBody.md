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

- Brainstorming / ideation → the `explore` skill
- Insight capture → the `insight` skill plus the `capture_insight` MCP tool
- User-state awareness → automatic via the `capture_personal_context` MCP tool, guided by the injected `<personal-context>` block; manage it with `personal-status`
- Session retrospective → an automatic brief recap as the session wraps up; no explicit invocation exists

## Flow & Priority

1. Vague or ambiguous input → converge scope by asking one question at a time before acting.
2. Ideation signals ("idea", "stuck", "brainstorm") → use `explore` to gather related material, then develop candidate options in the session.
3. A plan or spec path plus "review" / "check" → compare it directly with its requirements and evidence. Once scope is clear, proceed with the requested work.
4. As the session wraps up, surface a brief recap automatically; persist it only when the user explicitly asks. `reflect` is the vault judge, never a session recap.
5. Insight capture runs automatically through the `capture_insight` MCP tool and the `insight-injector` hook; direct invocation is not required.

## Persistence Rules

- Ephemeral, never persisted: intermediate analysis, interview notes, candidate options, and raw `explore` results.
- Durable, persisted only with explicit approval: a final scoped prompt or plan, a selected interpretation, and risks surfaced during review.
- Principle capture: record durable premises and validated predictions with `capture_insight(category=principle)`.
- Insight category defaults: accept `principle`; reject `refuted_premise` and `ephemeral_candidate`.
