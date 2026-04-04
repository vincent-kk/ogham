# resolve-review — Reference Documentation

Output format templates and detailed workflow reference for the
fix request resolution skill.

## justifications.md Format

```markdown
---
resolve_commit_sha: <base_sha captured at Step 4 start (pre-fix HEAD)>
resolved_at: <ISO 8601>
branch: <branch name>
total_fixes: <total fix count>
accepted: <accepted count>
rejected: <rejected count>
---

# Justifications — <branch name>

**Date**: <ISO 8601>
**Accepted Fixes**: N / M
**Rejected Fixes**: K

---

## JUST-001: FIX-<ID> Rejection

- **Original Fix**: <fix title and description>
- **Severity**: <severity>
- **Path**: `<file path>`
- **Rule Violated**: <rule>
- **Developer Decision**: REJECTED
- **Developer's Justification**: "<raw justification text>"
- **Refined ADR**: "<structured ADR text>"
- **Debt Created**: `.filid/debt/<debt-file-name>.md`

---
```

> **Note**: `justifications.md` is a local inter-stage communication file. It is
> NOT committed to git. It lives in `.filid/review/<branch>/` which is gitignored.
> `revalidate` reads it from local disk via `resolve_commit_sha` in the frontmatter.
> Explicitly `git add`-ing a gitignored path overrides the exclusion — never stage this file.

## ADR Refinement Guidelines

Transform raw developer justification into structured ADR format:

```
ADR-<date>: <concise decision title>
Context: <original fix request + rule violated + current metric value>
Decision: <what was decided and why>
Consequences: <technical debt created, future impact, estimated resolution>
```

**Refinement rules**:

1. Preserve the developer's core reasoning — do not alter intent
2. Add structural context (rule, metric, fractal path)
3. Include estimated resolution timeframe if mentioned
4. Reference the created debt file ID

## Fix Item Types

Each fix item in `fix-requests.md` has an optional `type` field that determines
how the resolve skill processes it:

| Type | Default | Handler | Description |
|------|---------|---------|-------------|
| `code-fix` | yes | `code-surgeon` subagent | Standard code patch (inline edit) |
| `promote` | no | `Skill("filid:promote")` | test.ts → spec.ts promotion (3+12 compliance) |
| `restructure` | no | `Skill("filid:restructure")` | Module split/reorganization (LCOM4 >= 2) |

When `type` is absent, the item is treated as `code-fix`.

### Fix Item Format by Type

**code-fix** (default):
```markdown
### FIX-001: Unused import in validator.ts
- **Severity**: LOW
- **Path**: `src/core/validator.ts`
- **Rule**: zero-peer-file
- **Type**: code-fix
- **Action**: Remove unused import on line 12
- **Patch**: (inline diff)
```

**promote**:
```markdown
### FIX-002: spec.ts 3+12 rule violation
- **Severity**: MEDIUM
- **Path**: `src/core/__tests__/unit/parser.test.ts`
- **Rule**: 3+12 rule (18 test cases, limit 15)
- **Type**: promote
- **Action**: Promote test.ts to spec.ts with 3+12 split
```

**restructure**:
```markdown
### FIX-003: Module cohesion below threshold
- **Severity**: HIGH
- **Path**: `src/core/validator.ts`
- **Rule**: LCOM4 >= 2 (current: 3)
- **Type**: restructure
- **Action**: Split module into focused sub-modules
```

### Dispatch Sequence

1. **Phase 4a**: All `code-fix` items dispatched to `code-surgeon` in parallel
2. **Phase 4b**: After code fixes complete, `promote` and `restructure` items
   processed sequentially via their respective skills
3. Structural fix failures are **non-blocking** — logged and skipped

## Accepted Fix Output Format

Accepted fixes are applied directly to source files via parallel `code-surgeon`
subagents (code-fix type) or via skill invocations (promote/restructure type).
After all handlers complete, report results:

```markdown
### FIX-<ID>: <title> — APPLIED

**Path**: `<file path>`
**Change**: <brief description of what was changed>
**Status**: Modified ✓
```

## AskUserQuestion Patterns

### Fix Item Selection

Present each fix with severity context:

```
Question: "FIX-001: spec.ts 3+12 rule violation (HIGH)"
Options:
  - Accept: "Apply the recommended split"
  - Reject: "Defer with justification"
```

### Justification Collection

For rejected items, collect free text:

```
Question: "Why are you rejecting FIX-001? Provide your justification."
Options:
  - (free text input via "Other" option)
```

## MCP Tool Usage

| Tool            | Action             | When                               |
| --------------- | ------------------ | ---------------------------------- |
| `review_manage` | `normalize-branch` | Step 1: branch detection           |
| `debt_manage`   | `create`           | Step 5: for each rejected fix item |

## debt_manage(create) Input Schema

```json
{
  "action": "create",
  "projectRoot": "<project root>",
  "debtItem": {
    "fractal_path": "src/features/auth",
    "file_path": "src/features/auth/validator.ts",
    "created_at": "2026-02-22T00:00:00Z",
    "review_branch": "feature/issue-6",
    "original_fix_id": "FIX-002",
    "severity": "HIGH",
    "rule_violated": "LCOM4 >= 2",
    "metric_value": "LCOM4=3",
    "title": "validator.ts module cohesion — split deferred",
    "original_request": "<original FIX-002 request text>",
    "developer_justification": "Sprint deadline in 2 days...",
    "refined_adr": "ADR-2026-02-22: validator.ts module split deferred..."
  }
}
```
