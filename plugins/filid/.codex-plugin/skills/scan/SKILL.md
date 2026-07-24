---
name: scan
user_invocable: true
description: '[filid:scan] Scan the entire project for FCA-AI rule violations across INTENT.md documents, organ boundaries, and test file structure, then produce a prioritized report with optional --fix auto-remediation.'
argument-hint: '[path] [--fix]'
version: '1.0.0'
complexity: medium
plugin: filid
---

> **EXECUTION MODEL**: Execute all phases as a SINGLE CONTINUOUS OPERATION.
> After each phase completes, IMMEDIATELY proceed to the next in the SAME TURN.
> NEVER yield after `mcp__plugin_filid_tools__fractal_scan` result, parallel rule evaluations, or
> violation aggregation.
>
> **Valid reasons to yield**:
>
> 1. User decision genuinely required
> 2. Terminal stage marker emitted: `Scan complete: N violations` or `Scan complete: no violations found`
>
> **HIGH-RISK YIELD POINTS**:
>
> - After Phase 1 `mcp__plugin_filid_tools__fractal_scan` returns — chain Phases 2–4 in the same response (the "CRITICAL — No-Yield Execution" directive under the "## Core Workflow" section heading is authoritative)
> - `--fix` auto-remediation loop — do NOT pause between fixes; continue until all applicable violations are addressed
> - Final violation report — emit consolidated report AND end in the same turn

# scan — FCA-AI Rule Scanner

Scan the project for FCA-AI rule violations across INTENT.md documents,
organ directory boundaries, and test file structure. Produces a prioritised
violation report and, with `--fix`, applies automatic remediation.

> **Detail Reference**: For detailed workflow steps, MCP tool examples,
> and output format templates, read the `reference.md` file in this
> skill's directory (same location as this SKILL.md).

## When to Use This Skill

- Auditing the project before opening a pull request
- Checking for regressions after a large-scale refactor
- Verifying that `/filid:setup` produced a fully compliant structure
- Running a periodic governance health check
- Preparing a baseline report before `/filid:structure-review` or `/filid:promote`

### Relationship with update

`/filid:update` Stage 1 performs a similar branch-scoped violation scan using a `qa-reviewer` agent
with direct MCP calls. This standalone skill (`/filid:scan`) always scans the full project independently.

## Core Workflow

> **CRITICAL — No-Yield Execution**: Every step below MUST chain directly into
> the next via tool calls. NEVER output a text-only response between phases.
> After each phase completes, immediately invoke the next phase's tool calls
> in the same response.

### Phase 1 — Tree Construction

Build the project hierarchy using `mcp__plugin_filid_tools__fractal_scan` and partition into fractal
nodes, organ nodes, and spec files.
See [reference.md Section 1](./reference.md#section-1--tree-construction).

> **Phase 1 result handling**: call `mcp__plugin_filid_tools__fractal_scan` with
> `outputMode: "paths"` — the scan phases only need per-node
> `path`/`type`/`hasIntentMd`/`hasDetailMd`. Treat the response as INTERNAL
> working data — do NOT echo the `nodes` array in your response. If the
> response is `{ truncated: true, reportPath, summary }`, the report was
> written to `reportPath` — grep that file for node fields instead of loading
> it whole. Extract the three working sets (fractal nodes, organ nodes, spec
> files) silently and proceed to Phase 2–4 tool calls in the same response.

**Immediately after** receiving `mcp__plugin_filid_tools__fractal_scan` results, proceed to Phase 2–4
in the same response — do NOT summarize or report Phase 1 results first.

### Phases 2–4 (Inline Parallel — same response as Phase 1 result)

Execute all three phases as **parallel inline tool calls in a single response**.
Do NOT use background agents or subagents — call the tools directly:

- **Phase 2** — Read each INTENT.md (parallel Read calls) and check line count + boundary sections
- **Phase 3** — Filter organ nodes from Phase 1 results and check for INTENT.md presence (no extra tool calls needed if Phase 1 data suffices; use Glob only if needed)
- **Phase 4** — Call `mcp__plugin_filid_tools__test_metrics` with `action: "check-gate"` for all spec files

Launch all independent Read/Glob/MCP calls for Phases 2–4 as **parallel tool
calls in one response**. Then proceed directly to Phase 5.

### Phase 2 — INTENT.md Validation

Check line count (≤50) and 3-tier boundary sections for every INTENT.md using Read and Grep.
See [reference.md Section 2](./reference.md#section-2--intentmd-validation).

### Phase 3 — Organ Directory Validation

Verify no organ directory contains a INTENT.md file using `mcp__plugin_filid_tools__fractal_scan` results from Phase 1.
See [reference.md Section 3](./reference.md#section-3--organ-directory-validation).

### Phase 4 — Test File Validation (3+12 Rule)

Validate all `*.spec.ts` files against the 15-case limit using `mcp__plugin_filid_tools__test_metrics`.
See [reference.md Section 4](./reference.md#section-4--test-file-validation-312-rule).

### Phase 5 — Violation Aggregation & Marker Emission (Immediately after Phases 2–4)

Aggregate Phase 2–4 results into the violation report **in the same response**.
The report is internal output, not a final user message — emit the terminal
marker `Scan complete: N violations` (or `Scan complete: no violations found`)
on the **last line** of the response, then end execution.

With `--fix`, apply auto-remediations using **foreground** agents (not
background), then re-validate:

- **INTENT.md line-count violations**: delegated to `context-manager` agent
  (trims and compresses to bring within the 50-line limit).
- **INTENT.md missing boundary sections**: delegated to `context-manager` agent
  (appends skeleton "Always do" / "Ask first" / "Never do" sections).
- **Organ directory INTENT.md violations**: delegated to `code-surgeon` agent
  (deletes the forbidden INTENT.md from the organ directory via Bash). The
  `context-manager` agent handles INTENT.md authoring/editing only —
  detection and evaluation, not deletion.
- **3+12 rule violations in spec files**: delegated to `code-surgeon` agent
  (parameterizes repetitive `it()` blocks into `it.each()` tables).
- Violations that require architectural decisions (reclassification, missing
  index.ts, structural drift) are **reported but not auto-fixed** — run
  `/filid:sync` or `/filid:restructure` for those.

After remediations, re-validate fixed files and include a before/after diff
in the final report.
See [reference.md Section 5](./reference.md#section-5--report-formats).

## Available MCP Tools

| Tool                                | Action      | Purpose                                                |
| ----------------------------------- | ----------- | ------------------------------------------------------ |
| `mcp__plugin_filid_tools__fractal_scan` | —           | Build complete project hierarchy for scan              |
| `mcp__plugin_filid_tools__test_metrics` | `check-gate` | Validate 3+12 rule across all spec files               |
| `mcp__plugin_filid_tools__doc_compress` | `auto`      | (`--fix`) Compress INTENT.md via context-manager agent |

## Options

> Options are LLM-interpreted hints, not strict CLI flags. Natural language works equally well (e.g., "고칠 수 있는 건 고쳐줘" instead of `--fix`).

```
/filid:scan [path] [--fix]
```

| Parameter | Type   | Default                   | Description                                 |
| --------- | ------ | ------------------------- | ------------------------------------------- |
| `path`    | string | Current working directory | Root directory to scan                      |
| `--fix`   | flag   | off                       | Apply automatic remediations where possible |

## Quick Reference

```bash
# Scan current project (report only)
/filid:scan

# Scan a specific sub-directory
/filid:scan src/payments

# Scan and auto-fix eligible violations
/filid:scan --fix

# Phases: 1 (Tree) → [2 + 3 + 4 in parallel] → 5 (Report)
# Agents (--fix only): context-manager (INTENT.md remediation), code-surgeon (3+12 remediation)
# Thresholds
INTENT_MD_LINE_LIMIT = 50 lines
TEST_THRESHOLD       = 15 test cases per spec file
ORGAN_DIR_NAMES      = components | utils | types | hooks | helpers
                       | lib | styles | assets | constants
                       | test | tests | spec | specs | fixtures | e2e
                       | references
# __tests__, __mocks__, __fixtures__ are pattern-matched (priority 3), NOT list-matched.
```
