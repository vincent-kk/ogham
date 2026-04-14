---
name: filid-restructure
user_invocable: false
description: "[filid:filid-restructure] Analyze project directory structure and apply fractal principle restructuring through a proposal, user approval, execution, and validation workflow with optional dry-run and auto-approve modes."
argument-hint: "[path] [--dry-run] [--auto-approve]"
version: "1.0.0"
complexity: complex
plugin: filid
---

> **EXECUTION MODEL (Tier-2b interactive-aware)**: Execute all stages as a
> SINGLE CONTINUOUS OPERATION EXCEPT at Stage 2 (Plan Review & Approval)
> when `--auto-approve` is absent. At that EXACT step, `AskUserQuestion`
> yield is REQUIRED. At all other stages, NEVER yield.
>
> **Under `--auto-approve` mode**: Stage 2 approval is skipped; EXECUTION
> MODEL applies to every stage without exception.
>
> **Valid reasons to yield**:
> 1. Stage 2 interactive approval active (no `--auto-approve`)
> 2. Terminal stage marker emitted: `Restructure complete: N moves applied` or `Restructure dry-run complete`
>
> **HIGH-RISK YIELD POINTS**:
> - After parallel MCP calls (`mcp_t_fractal_scan`, `mcp_t_drift_detect`, `mcp_t_rule_query`) — chain `mcp_t_lca_resolve` and `fractal-architect` delegation without pause
> - After `fractal-architect` returns proposal — chain Stage 2 approval or `--auto-approve` execution in the same turn
> - Stage 3 `restructurer` execution — do NOT pause between file moves, renames, or index.ts creations
> - Stage 4 validation — emit final verdict AND end in the same turn

# filid-restructure — Fractal Structure Restructuring

Analyze the current project directory structure and restructure it according to
fractal principles. The `fractal-architect` agent performs the analysis and produces
a concrete proposal; after user approval the `restructurer` agent executes the file
moves, renames, index.ts creations, and import path updates.

> **Detail Reference**: For detailed workflow steps, MCP tool call examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Migrating an existing project to a fractal directory structure
- Recovering a project that has drifted from fractal principles after a large refactor
- Fixing fractal modules that have been placed incorrectly under organ directories
- Resolving accumulated structural violations in one coordinated operation
- Splitting hybrid nodes into clean fractal or organ directories

## Core Workflow

### Stage 1 — Analysis & Proposal

The skill invokes MCP tools and passes the results to `fractal-architect` for analysis. MCP calls run in **parallel**:

- The skill calls `mcp_t_fractal_scan`, `mcp_t_drift_detect`, and `mcp_t_rule_query` **simultaneously**.
- The skill calls `mcp_t_lca_resolve` after `mcp_t_drift_detect` completes (requires its output).
- `fractal-architect` receives all MCP results and generates the restructuring proposal.

> `fractal-architect` does not call MCP tools directly — the skill owns all MCP invocations and injects results into the agent's task prompt (consistent with the Capability Model in Stage 4).

After all calls complete, `fractal-architect` generates a concrete restructuring proposal.
See [reference.md Section 1](./reference.md#section-1--analysis--proposal).

### Stage 2 — Plan Review & Approval

The restructuring plan is presented to the user with a summary of affected files.
Explicit approval is required before any changes are made.
`--auto-approve` skips this stage.
See [reference.md Section 2](./reference.md#section-2--plan-review--approval).

### Stage 3 — Execution

`restructurer` applies the approved plan in priority order: file moves, renames,
index.ts creation, and import path updates.
`--dry-run` skips this stage (no file changes are made).
See [reference.md Section 3](./reference.md#section-3--execution).

### Stage 4 — Validation

**The skill (not the agent) invokes `mcp_t_structure_validate`** on the modified tree
after `restructurer` returns, then passes the validation report to
`fractal-architect` for interpretation and remediation recommendations.
Per the agent Capability Model (`agents/INTENT.md`-equivalent policy), agents
do not call MCP tools directly — orchestrating skills own all MCP invocations.

1. Skill calls `mcp_t_structure_validate({ path, rules })` with the modified tree root.
2. Skill forwards the `ValidationReport` to `fractal-architect` in the task prompt.
3. `fractal-architect` reads the report and reports any remaining violations.

`--dry-run` skips this stage.
See [reference.md Section 4](./reference.md#section-4--validation).

## Available MCP Tools

| Tool                 | Stage | Purpose                             |
| -------------------- | ----- | ----------------------------------- |
| `mcp_t_fractal_scan`       | 1     | Full structure scan                 |
| `mcp_t_drift_detect`       | 1     | Detect fractal principle deviations |
| `mcp_t_lca_resolve`        | 1     | Resolve move targets via LCA        |
| `mcp_t_rule_query`         | 1     | Fetch active rules                  |
| `mcp_t_structure_validate` | 4     | Validate post-execution structure   |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "바뀌는 것만 보여줘" instead of `--dry-run`).

```
/filid:filid-restructure [path] [--dry-run] [--auto-approve]
```

| Option           | Type   | Default                   | Description                                       |
| ---------------- | ------ | ------------------------- | ------------------------------------------------- |
| `path`           | string | Current working directory | Root directory to restructure                     |
| `--dry-run`      | flag   | off                       | Preview plan without making any changes           |
| `--auto-approve` | flag   | off                       | Skip user approval (CI / automation environments) |

## Quick Reference

> **Internal skill** (`user_invocable: false`) — invoked by orchestrator skills such as `filid-resolve` and `filid-sync`. Not intended for direct user invocation.

```
Stages:  Analysis → Plan → Execute → Validate
         Stage 1: fractal_scan + drift_detect + rule_query run in parallel;
                  lca_resolve runs after drift_detect
Agents:  fractal-architect (Stage 1, 4), restructurer (Stage 3)
Dry-run: Prints plan then exits — no file changes
```

Key rules:

- Always run with `--dry-run` first to review the plan before applying
- `--auto-approve` is recommended only in validated CI environments
- If an out-of-scope change is discovered mid-execution, execution stops and reports
