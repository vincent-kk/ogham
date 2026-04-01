# maencof-lens Development Plan

Read-only Claude Code plugin for accessing maencof vault knowledge from development contexts.

## Design Documents

All design documents are located in [`../../.metadata/maencof-lens/`](../../.metadata/maencof-lens/).

| Document | Description |
|----------|-------------|
| [design-spec.md](../../.metadata/maencof-lens/design-spec.md) | Upper-level design spec — requirements, scenarios, scope boundaries |
| [blueprint.md](../../.metadata/maencof-lens/blueprint.md) | Architecture blueprint — package structure, module dependency, data flow, RALPLAN-DR |
| [phase-specs.md](../../.metadata/maencof-lens/phase-specs.md) | 6-phase implementation specs with TypeScript interfaces and acceptance criteria |
| [work-plan.md](../../.metadata/maencof-lens/work-plan.md) | Task list, dependency graph, risk register, integration test plan |
| [maencof-separation-analysis.md](../../.metadata/maencof-lens/maencof-separation-analysis.md) | Handler purity analysis — confirms zero maencof refactoring for v1 |

## Key Decisions

- **Approach**: Thin wrapper (Option A) — import maencof handlers directly via workspace dependency
- **Tools**: 5 read-only MCP tools (`lens_search`, `lens_context`, `lens_navigate`, `lens_read`, `lens_status`)
- **Config**: `.maencof-lens/config.json` in dev context root, managed by `/maencof-lens:setup-lens` skill
- **maencof changes**: None for v1. v1.1: add `layer_filter` to `handleKgContext` (3-line change)

## Execution Order

```
Phase 1  Package scaffolding + config system
Phase 6.1-6.6  Build infra (early validation of esbuild bundling)
Phase 2  MCP server + vault router + graph cache
Phase 3  5 tool wrappers with layer filtering
Phase 4  SessionStart hook + prompt injection
Phase 5  setup-lens skill
Phase 6.7-6.9  FCA docs + monorepo integration + verification
```

## Known Limitations (v1)

- `lens_context` token budget accuracy degrades with excluded-layer content (post-filter only)
- No cross-vault unified search
- No remote vault support
- No sub-layer filtering
