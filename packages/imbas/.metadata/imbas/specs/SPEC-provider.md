---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-provider — Provider Abstraction Principle

## Purpose

Defines where and how imbas expresses the difference between issue-tracking
providers (`jira`, `github`, `local`).

## Decision

Provider abstraction lives in the **skill / reference layer**, not in
TypeScript. Specifically:

1. `ImbasConfigSchema.provider` — a single `z.enum(['jira','github','local'])`
   field with `default('jira')` controls dispatch at runtime.
2. **Skill-level routing** via the `<!-- imbas:constraints-v1 -->` anchor
   block in each provider-aware `SKILL.md`. The block contains a 3-row
   dispatch table naming the provider-specific `references/<provider>/workflow.md`
   file to load.
3. **Reference directory partitioning** — each provider-aware skill's
   `references/` directory contains provider-specific subdirectories
   (`jira/`, `local/`) holding workflow/tools/errors files plus any
   provider-specific helper files.

## Threshold Rule

Partitioning is expensive (doubles reference file count, adds drift risk).
It is applied only when per-provider divergence exceeds 15 lines in any of
workflow/tools/errors. Below the threshold, inline branching in the flat
file is preferred.

**Precedent acknowledgement**: inline branching predates this spec. The
file `skills/manifest/references/workflow.md` historically carried a
`[jira]` / `[github]` inline block at the drift-check step. That block
was preserved during Phase C1 copy-then-delete and now lives in
`skills/manifest/references/jira/workflow.md` under the
"GitHub prototype (preserved)" section, anchoring the follow-up GitHub
RALPLAN cycle.

## Rejected alternatives

### Option B — TypeScript `IssueExecutor` class hierarchy

Rejected. The imbas codebase has verified (2026-04-06) that:

- `src/core/providers/` does not exist.
- `src/types/manifest.ts:StoryItemSchema.issue_ref` is already
  `z.string().nullable()` — provider-agnostic.
- No TypeScript code in `src/` makes tracker HTTP calls; every tracker
  interaction happens through the `atlassian` MCP server orchestrated by
  skill instructions.

Adding a provider class hierarchy would create dead code that never
executes I/O. The abstraction belongs one layer up, at the prompt/skill
layer where the LLM actually decides which tool to invoke.

### Option C — Universal inline branching

Rejected as a universal strategy. For HIGH-divergence skills (manifest,
read-issue, digest, devplan), inline branching would inflate a single
`workflow.md` beyond 500 lines and force the LLM to load all provider text
per run, violating the context-isolation principle. Retained for
LOW-divergence skills (`validate`, `cache`, `fetch-media`, `pipeline`,
`status`) where the 15-line threshold is not crossed.

### Option D — Per-provider agent files

Deferred to follow-up. Splitting
`agents/imbas-engineer.md` into
`imbas-engineer-jira.md` + `imbas-engineer-local.md` with disjoint
`tools:` frontmatter would provide hard enforcement of provider isolation.
For v1 the soft constraint (body prose + `scripts/check-agent-tools-frontmatter.mjs`
baseline gate) is considered sufficient. If context-leakage incidents
emerge, revisit.

## Dispatch surface

The `<!-- imbas:constraints-v1 -->` anchor block is the **sole** dispatch
surface. No `references/provider-routing.md` file exists in any skill.
Duplicating dispatch logic across multiple files would be a drift hazard.

Standard anchor block template (see `SPEC-skills.md` for the verbatim
content):

```markdown
<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load inputs via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`  | `references/jira/workflow.md` |
   | `local` | `references/local/workflow.md` |

4. Execute those steps exactly.
5. Persist outputs via imbas_tools.

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__*, Read/Write/Edit for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
```

## Placement rules

- Jira executor content → each skill's `references/jira/**` (see `SPEC-provider-jira.md`)
- Local executor content → each skill's `references/local/**` (see `SPEC-provider-local.md`)
- GitHub executor content → each skill's `references/github/**` (see `SPEC-provider-github.md`)

## Enforcement

- `src/__tests__/skill-constraints-block.test.ts` — asserts anchor presence,
  dispatch table completeness, and absence of raw tracker tokens outside
  the anchor block.
- `scripts/check-agent-tools-frontmatter.mjs` — prevents silent widening of
  agent `tools:` arrays.
