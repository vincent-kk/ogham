# Error Handling

Consolidated error table from all pipeline phases, plus pipeline-specific errors.

---

## Error Table

### Phase 0 — Precondition Errors

| Error | Action |
|-------|--------|
| No config.json found | STOP: "imbas not initialized. Run /imbas:imbas-setup first." |
| No project key (argument or config) | STOP: "No project key. Run /imbas:imbas-setup or pass --project KEY." |
| No codebase path in devplan mode | STOP: "Devplan pipeline requires --codebase. Subtask generation needs a codebase to explore." |
| Source file not found | STOP: "Source file not found: \<path\>. Check the path and try again." |
| Confluence URL invalid / page not found | STOP: "Could not fetch Confluence page. Verify the URL and your permissions." |

### Phase 1 — Validate Errors

| Error | Action |
|-------|--------|
| mcp_tools_run_create fails | STOP: display error. Common: "Run directory already exists." |
| `analyst` agent fails | STOP: set validate.result = "BLOCKED". Note: "Agent error during validation." |
| validation-report.md parse error | STOP: treat as BLOCKED. "Could not parse validation report." |

### Phase 2 — Split Errors

| Error | Action |
|-------|--------|
| Parent issue not found (--parent KEY) | STOP: "Issue \<KEY\> not found. Check the key or use --parent new." |
| `planner` produces no Stories | Check: if document is atomic → escape E2-3. Otherwise → escape E2-1. |
| `planner` agent fails | STOP: save partial state. "Planner agent error. Check source document format." |
| `analyst` reverse-inference fails | STOP: save partial state. "Reverse-inference verification failed." |
| Manifest validation errors (auto-fix fails) | STOP: list errors. "Manifest validation failed. Review stories manually." |
| mcp_tools_run_transition precondition fail | STOP: "Cannot transition: \<error from tool\>." |

### Phase 2.5 — Manifest Stories Errors

| Error | Action |
|-------|--------|
| No Jira-capable tool available | STOP: "No Jira-capable tool detected. Register a Jira MCP server or plugin first." |
| [OP: create_issue] fails (single item) | Log error on item (status: "pending"), continue with next. Report at end. |
| Any Story status remains "pending" after batch | STOP: "Manifest stories partially failed. Devplan requires all issue_refs. Re-run: /imbas:imbas-manifest stories --run \<run-id\>" |
| [OP: create_link] fails | Log error, continue. Note in final report. |
| Epic creation fails | STOP: "Epic creation failed. Check Jira project settings." |

### Phase 3 — Devplan Errors

| Error | Action |
|-------|--------|
| Stories not in Jira (any pending) | STOP: "Stories must exist in Jira. Run /imbas:imbas-manifest stories --run \<run-id\> first." |
| `engineer` agent fails | Save partial manifest if available. STOP: "Engineer agent error. Partial results saved." |
| AST tools unavailable (sgLoadError) | Non-blocking. Log warning once, agent uses LLM fallback. Note in final report. |
| No Subtasks generated for a Story | Flag Story in report. Non-blocking for pipeline (Story may legitimately have no technical work). |
| Manifest validation errors | STOP: list errors. "Devplan manifest validation failed." |

### Phase 3.5 — Manifest Devplan Errors

| Error | Action |
|-------|--------|
| No Jira-capable tool available | STOP: "No Jira-capable tool detected. Register a Jira MCP server or plugin first." |
| [OP: create_issue] fails (single item) | Log error on item, continue with next. Report at end. |
| ID resolution fails (no issue_ref for reference) | Skip item, log: "Cannot resolve \<ID\> — parent not yet created." |
| [OP: add_comment] fails | Log error, continue. Note in final report. |
| Partial failure after batch | NON-BLOCKING report: list failures + "/imbas:imbas-manifest devplan --run \<run-id\> to retry." |

---

## Recovery Patterns

### Full Re-run

When pipeline stops at a gate, the safest recovery is fixing the issue and re-running:

```
/imbas:imbas-pipeline <source> --project <KEY> [--parent <KEY>]
```

This creates a NEW run (new run_id). Previous run state is preserved and can be inspected with `/imbas:imbas-status <old-run-id>`.

### Resume After Planning-Only

When pipeline completed in planning-only mode (no `--codebase`), resume with codebase:

```
# Re-run full pipeline with codebase:
/imbas:imbas-pipeline <source> --codebase /path/to/repo

# Or run devplan individually on the existing run:
/imbas:imbas-devplan --run <run-id> --codebase /path/to/repo
/imbas:imbas-manifest devplan --run <run-id>
```

### Manual Continuation

When pipeline stops after some phases completed, continue manually from the stop point:

```
# After Phase 1 (validate) stop:
/imbas:imbas-split --run <run-id>           # manual review + approve
/imbas:imbas-manifest stories --run <run-id>
/imbas:imbas-devplan --run <run-id>
/imbas:imbas-manifest devplan --run <run-id>

# After Phase 2 (split) stop:
/imbas:imbas-split --run <run-id>           # review flagged Stories
/imbas:imbas-manifest stories --run <run-id>
/imbas:imbas-devplan --run <run-id>
/imbas:imbas-manifest devplan --run <run-id>

# After Phase 2.5 (manifest-stories) partial failure:
/imbas:imbas-manifest stories --run <run-id>  # retry failed items (idempotent)
/imbas:imbas-devplan --run <run-id>
/imbas:imbas-manifest devplan --run <run-id>

# After Phase 3 (devplan) stop:
/imbas:imbas-devplan --run <run-id>           # review flagged items
/imbas:imbas-manifest devplan --run <run-id>

# After Phase 3.5 (manifest-devplan) partial failure:
/imbas:imbas-manifest devplan --run <run-id>  # retry failed items (idempotent)
```

### Idempotency

Manifest execution is idempotent: items with existing issue_ref are skipped on re-run.
This makes retry-after-failure safe — already-created items are not duplicated.

---

## Pipeline-Specific Errors

These errors only occur in pipeline context (not in individual skills):

| Error | Condition | Action |
|-------|-----------|--------|
| Gate auto-approval failed | Verification fields not all PASS | STOP: list specific failures with Story/item IDs |
| --parent argument invalid | Not a valid Jira key, "new", or "none" | STOP: "Invalid --parent value. Use Epic key, 'new', or 'none'." |
| --parent is unsupported issue type | Issue exists but is not Epic | STOP: "\<KEY\> is a \<type\>. --parent accepts Epic key, 'new', or 'none'." |
| Story key not found (devplan mode) | [OP: get_issue] returns not found | STOP: "Issue \<KEY\> not found in Jira." |
| Story key is not a Story (devplan mode) | Issue type is not Story | STOP: "\<KEY\> is a \<type\>, not a Story." |
| Mixed project keys in Story input | PROJ-42,OTHER-10 have different projects | STOP: "All Story keys must belong to the same project." |
| --stop-at value invalid | Not one of: validate, split, manifest-stories, devplan | STOP: "Invalid --stop-at value." |
| Phase 2.5 Story failure blocks Phase 3 | Any Story creation failed | STOP: devplan requires all issue_refs |
| No codebase — planning-only stop | Document pipeline, --codebase not resolved | Normal exit after manifest-stories with planning-only report and resume guidance |
