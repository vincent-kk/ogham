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
- **Prompt Injection**: Skill usage guide (not raw tool list)
- **maencof changes**: None for v1. v1.1: add `layer_filter` to `handleKgContext` (3-line change)

## Phase 7 Implementation Plan

Phase 1-6 are complete. Phase 7 adds the extended interface layer.

### Changes Overview

| Component | Type | Action |
|-----------|------|--------|
| `skills/lookup/SKILL.md` | Skill | **New** — keyword search → document read → summary |
| `skills/context/SKILL.md` | Skill | **New** — token budget context assembly |
| `agents/researcher.md` | Agent | **New** — autonomous 5-tool vault exploration |
| `src/hooks/session-start.ts` | Hook | **Modify** — skill usage guide instead of tool list |
| `.claude-plugin/plugin.json` | Config | **Modify** — add `agents` field |
| `CLAUDE.md` | Doc | **Modify** — reflect 3 skills + 1 agent |
| `INTENT.md` | Doc | **Modify** — update Structure section |

### MCP Tool Access Level Changes

| Tool | Before | After |
|------|--------|-------|
| `lens_search` | Direct user | Skill/Agent mediated |
| `lens_context` | Direct user | Skill/Agent mediated |
| `lens_navigate` | Direct user | **Agent only** |
| `lens_read` | Direct user | Skill/Agent mediated |
| `lens_status` | Direct user | **Agent/Hook only** |

### Prompt Injection Change

**Before**:
```
Available tools: lens_search, lens_context, lens_navigate, lens_read, lens_status
```

**After**:
```
사용 방법:
- /maencof-lens:lookup <키워드>: vault 지식 검색 및 조회
- /maencof-lens:context <쿼리>: 컨텍스트 조립
```

### Task Execution Order

```
7.1  Create skills/lookup/SKILL.md
7.2  Create skills/context/SKILL.md
7.3  Create agents/researcher.md
7.4  Update src/hooks/session-start.ts (prompt change)
7.5  Update .claude-plugin/plugin.json (add agents field)
7.6  Update CLAUDE.md (3 skills + 1 agent)
7.7  Update INTENT.md (structure section)
7.8  Rebuild: yarn build (bundle updated session-start hook)
```

Tasks 7.1-7.3 are independent (SKILL.md/AGENT.md files, no TypeScript).
Task 7.4 is the only code change (session-start.ts).
Tasks 7.5-7.7 are doc/config updates.
Task 7.8 is the final build verification.

### Acceptance Criteria

- [ ] `/maencof-lens:lookup` skill — complete workflow (search → read → summarize)
- [ ] `/maencof-lens:context` skill — complete workflow (search → context assembly)
- [ ] `maencof-lens:researcher` agent — 5 MCP tools, exploration strategy, trigger phrases
- [ ] SessionStart prompt shows skill usage, not tool list
- [ ] `plugin.json` includes `agents` field
- [ ] `CLAUDE.md` reflects Skills (3) + Agents (1)
- [ ] `INTENT.md` under 50 lines with updated structure
- [ ] `yarn build` succeeds with updated session-start hook

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
           + Prompt injection change
```

## Known Limitations (v1)

- `lens_context` token budget accuracy degrades with excluded-layer content (post-filter only)
- No cross-vault unified search
- No remote vault support
- No sub-layer filtering
