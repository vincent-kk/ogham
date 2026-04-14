# GitHub Provider — Label Bootstrap Protocol

Documents the startup label verification and creation protocol for the manifest
skill. Implements §1.9 (metadata cache / label bootstrap) from the design decisions.

## Purpose

GitHub issues cannot be created with a non-existent label via `--label`. Before
any `gh issue create` call, the required `type:*` and `status:*` labels MUST
exist in the target repository. This file describes how to ensure they do.

## Required labels

The following labels are always required:

| Label | Color (hex) | Category |
|-------|------------|----------|
| `type:epic` | `0075ca` | type |
| `type:story` | `0075ca` | type |
| `type:task` | `0075ca` | type |
| `type:subtask` | `0075ca` | type |
| `status:todo` | `e4e669` | status |
| `status:ready-for-dev` | `e4e669` | status |
| `status:in-progress` | `e4e669` | status |
| `status:in-review` | `e4e669` | status |
| `status:done` | `0e8a16` | status |

Plus any entries in `config.github.defaultLabels` (user-defined).

## Bootstrap protocol

Run at the start of every manifest execution (Step 0), before Step 2.5 drift check.

### Step B1 — List existing labels

```bash
gh label list --repo owner/repo --json name
```

Parse response: `[{"name": "bug"}, {"name": "type:story"}, ...]`
Extract name strings into a set.

### Step B2 — Compute missing labels

Diff the existing set against the required set defined above plus
`config.github.defaultLabels`. Collect missing names.

If the missing set is empty, bootstrap is complete — proceed to Step 2.5.

### Step B3 — Create missing labels

For each missing label:

```bash
gh label create "type:story" --repo owner/repo --color 0075ca
```

Run sequentially (not in parallel) to avoid race conditions on small repos.

### Step B4 — Fail-fast on 403

If `gh label create` exits non-zero AND stderr contains "403" or
"resource not accessible":

1. Emit this exact error message:
   ```
   gh label create failed: insufficient scopes. Run 'gh auth refresh -s repo' and retry.
   ```
2. Call `mcp_tools_run_transition` → `blocked` state.
3. STOP execution immediately. Do NOT proceed to `gh issue create`.

**No degraded mode.** Issues MUST NOT be created without the required labels.
This aligns with the jira provider's fail-fast semantics for missing custom fields.

### Step B5 — Other `gh label create` failures

If `gh label create` fails for a non-403 reason (e.g., network error, repo not found):
- Treat as `GH_CLI_MISSING` or `REPO_NOT_FOUND` per `errors.md`.
- Abort and report to user.

## Re-run behavior

Bootstrap is idempotent. If a label was successfully created on a previous run
that partially failed, `gh label create` on re-run will fail with "already exists"
(exit 1). The bootstrap step MUST tolerate this: check the existing label list
first (Step B1) and skip creation if already present.

## Cache note

The label inventory from Step B1 can be cached in the imbas run state for the
duration of the session via `mcp_tools_cache_set`. This avoids redundant `gh label list`
calls when processing large manifests with many issues.
