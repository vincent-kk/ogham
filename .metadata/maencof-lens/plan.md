# maencof-lens Development Plan

Read-only Claude Code plugin for accessing maencof vault knowledge from development contexts.

## Design Documents

All design documents are located in [`../../.metadata/maencof-lens/`](../../.metadata/maencof-lens/).

| Document | Description |
|----------|-------------|
| [design-spec.md](../../.metadata/maencof-lens/design-spec.md) | Upper-level design spec — requirements, scenarios, scope boundaries |
| [blueprint.md](../../.metadata/maencof-lens/blueprint.md) | Architecture blueprint — package structure, module dependency, data flow, RALPLAN-DR |
| [phase-specs.md](../../.metadata/maencof-lens/phase-specs.md) | 7-phase implementation specs with TypeScript interfaces and acceptance criteria |
| [work-plan.md](../../.metadata/maencof-lens/work-plan.md) | Task list, dependency graph, risk register, integration test plan |
| [maencof-separation-analysis.md](../../.metadata/maencof-lens/maencof-separation-analysis.md) | Handler purity analysis — confirms zero maencof refactoring for v1 |

## Key Decisions

- **Approach**: Thin wrapper (Option A) — import maencof handlers directly via workspace dependency
- **Tools**: 5 read-only MCP tools (`lens_search`, `lens_context`, `lens_navigate`, `lens_read`, `lens_status`)
- **Access Model**: Tools are skill/agent-mediated, not direct user access
- **Skills (3)**: `setup-lens` (config), `lookup` (search→read→summarize), `context` (token-budgeted assembly)
- **Agent (1)**: `researcher` — autonomous multi-tool vault exploration
- **Config**: `.maencof-lens/config.json` in dev context root, managed by `/maencof-lens:setup-lens` skill
- **Prompt Injection**: Skill usage guide + researcher hint (not raw tool list)
- **Agent Discovery**: Convention-based (`agents/` directory), no `plugin.json` field needed
- **maencof changes**: None for v1. v1.1: add `layer_filter` to `handleKgContext` (3-line change)

## Phase 7 Implementation Plan (Consensus Approved)

Phase 1-6 are complete. Phase 7 adds the extended interface layer.

### RALPLAN-DR Summary

**Principles**:
1. Markdown-first — skills and agents are SKILL.md/AGENT.md files, not TypeScript
2. Convention following — match existing maencof skill/agent patterns exactly
3. Minimal code change — only session-start.ts needs TypeScript modification
4. Read-only safety — all new components maintain the read-only vault principle

**Decision Drivers**:
1. Skill-constructor generates production-ready SKILL.md with proper YAML frontmatter
2. Agent format must match maencof's memory-organizer.md pattern for Claude Code plugin compatibility
3. Prompt injection change is the key UX shift — users interact via skills, not raw tools

**ADR**:
- Decision: Use `/skill-constructor` for skills, direct write for agent
- Alternatives: Manual authoring — rejected per user constraint
- Consequence: Skill-constructor must be available in executor environment

### MCP Tool Access Levels

| Tool | Access Level | Consumers |
|------|-------------|-----------|
| `lens_search` | Skill/Agent mediated | `lookup` skill, `researcher` agent |
| `lens_context` | Skill/Agent mediated | `context` skill, `researcher` agent |
| `lens_navigate` | Agent only | `researcher` agent |
| `lens_read` | Skill/Agent mediated | `lookup` skill, `researcher` agent |
| `lens_status` | Agent/Hook only | `researcher` agent, SessionStart hook |

**Note**: `context` skill uses `lens_context` only (NOT `lens_search`).
`lens_context` internally runs its own SA query via `handleKgContext` — a separate `lens_search` would be redundant.

### Task Flow

```
T1 (lookup SKILL.md)  ─┐
T2 (context SKILL.md)  ─┼─► T4 (session-start.ts) ─► T6 (docs) ─► T7 (build + verify)
T3 (researcher.md)     ─┘
```

### Task Details

| # | Task | Method | Files |
|---|------|--------|-------|
| T1 | Create lookup skill | `/skill-constructor` CREATE | `skills/lookup/SKILL.md` |
| T2 | Create context skill | `/skill-constructor` CREATE | `skills/context/SKILL.md` |
| T3 | Create researcher agent | Direct write | `agents/researcher.md` |
| T4 | Update prompt injection | Edit | `src/hooks/session-start.ts` |
| T6a | Update CLAUDE.md | Edit | `CLAUDE.md` |
| T6b | Update INTENT.md | Edit | `INTENT.md` |
| T6c | Create DETAIL.md | Write | `DETAIL.md` |
| T6d | Sync phase-specs 7.2 | Edit | `../../.metadata/maencof-lens/phase-specs.md` |
| T7 | Build + verify | `yarn build && yarn typecheck` | — |

### Prompt Injection Change

**Before**:
```
Available tools: lens_search, lens_context, lens_navigate, lens_read, lens_status
```

**After**:
```
Usage:
- /maencof-lens:lookup <keyword>: vault knowledge search and retrieval
- /maencof-lens:context <query>: token-budgeted context assembly
- Deep exploration: ask "vault research" or "vault explore" to trigger the researcher agent.
```

### Architect Review Notes (incorporated)

- ~~T5 (plugin.json agents field)~~ removed — agents discovered by convention, not manifest field. maencof (4 agents) and filid (7 agents) have no `agents` field.
- T2 context skill — removed redundant `lens_search` step. `lens_context` handles search internally.
- Researcher agent — added `allowed_layers: [2,3,4,5]` and `forbidden_operations` for pattern consistency with maencof agents.
- Prompt — added researcher agent trigger hint for discoverability.

### Acceptance Criteria

- [ ] `skills/lookup/SKILL.md` — complete workflow (search → read → summarize), `user_invocable: true`
- [ ] `skills/context/SKILL.md` — complete workflow (`lens_context` only, no redundant search), `user_invocable: true`
- [ ] `agents/researcher.md` — 5 MCP tools, `allowed_layers`, trigger phrases (Korean + English)
- [ ] `session-start.ts` — skill usage + researcher hint, no raw tool names
- [ ] `CLAUDE.md` — Skills (3) + Agents (1) reflected
- [ ] `INTENT.md` — structure updated, under 50 lines
- [ ] `DETAIL.md` — public API contracts for skills/agent/tools
- [ ] `phase-specs.md` 7.2 — context skill workflow synced (lens_search removed)
- [ ] `yarn build` and `yarn typecheck` pass

## Execution Order (full)

```
Phase 1    Package scaffolding + config system           ✅ Complete
Phase 6.1  Build infra (early validation)                ✅ Complete
Phase 2    MCP server + vault router + graph cache       ✅ Complete
Phase 3    5 tool wrappers with layer filtering          ✅ Complete
Phase 4    SessionStart hook + prompt injection          ✅ Complete
Phase 5    setup-lens skill                              ✅ Complete
Phase 6.7  FCA docs + monorepo integration + verification ✅ Complete
Phase 7    Skills (lookup, context) + Agent (researcher)  ⬜ Next
           + Prompt injection change + docs update
```

## Known Limitations (v1)

- `lens_context` token budget accuracy degrades with excluded-layer content (post-filter only)
- No cross-vault unified search
- No remote vault support
- No sub-layer filtering
