# Filesystem Write/Unlink Callsite Audit — filid MCP Tools

- **Date**: 2026-04-05
- **Scope**: `packages/filid/src/mcp/tools/**/*.ts` — write/unlink/rm/mkdir/rename callsites
- **Plan reference**: `.omc/plans/filid-structural-fix-round1.md` — T1 Security Boundary Hardening
- **Audit cap**: T1 covers debt-manage + up to 3 additional tools; surplus deferred to T1b.

## Covered Tools (4 of 16)

### 1. `debt-manage` — **NOW GUARDED (this PR)**

| # | file:line | function | path expression | containment status |
|---|---|---|---|---|
| 1 | `debt-manage.ts: handleCreate` | `handleCreate` | `join(getDebtDir(projectRoot), \`${id}.md\`)` | **SAFE** — `id` is deterministically derived inside the handler from `normalizeId(fractal_path, content)`; no caller-supplied segment reaches `join`. |
| 2 | `debt-manage.ts: handleCreate` | `handleCreate` | `mkdir(getDebtDir(projectRoot), { recursive: true })` | **SAFE** — fixed directory shape (`.filid/debt`) under `projectRoot`. |
| 3 | `debt-manage.ts: handleCreate` | `handleCreate` | `writeFile(filePath, ...)` | **SAFE** — uses the derived path from row 1. |
| 4 | `debt-manage.ts: handleList` | `handleList` | `readdir(debtDir)` + `readFile(join(debtDir, name))` | **SAFE** — `name` originates from `readdir` output, not user input. |
| 5 | `debt-manage.ts: handleResolve` | `handleResolve` | `join(getDebtDir(projectRoot), \`${debtId}.md\`)` → `unlink(filePath)` | **GUARDED (this PR)** — `assertUnder(getDebtDir(projectRoot), filePath)` runs before `unlink`. Prior to this PR the callsite was **UNGUARDED** (GAP-1, validate-plugin Round 1). |

### 2. `review-manage` — **ALREADY GUARDED (prior work)**

| # | file:line | function | path expression | containment status |
|---|---|---|---|---|
| 1 | `review-manage.ts: handleCleanup` | `handleCleanup` | `path.join(projectRoot, '.filid', 'review', normalizeBranch(branchName))` → `fs.rm(..., { recursive: true, force: true })` | **GUARDED** — inline `startsWith(expectedPrefix)` check at lines 334-341. Follow-up T2/T1 refactor will replace the inline guard with the shared `assertUnder` helper for SSoT. |
| 2 | `review-manage.ts` (other handlers) | various | session write paths under `<projectRoot>/.filid/review/<normalizedBranch>/` | **SAFE** — branch string is normalized via `normalizeBranch` (slash stripping) before path assembly; no raw caller segments reach `path.join`. |

### 3. `structure-validate` — **N/A (read-only)**

| # | file:line | function | path expression | containment status |
|---|---|---|---|---|
| — | `structure-validate.ts` | all | no write/unlink/rm/mkdir/rename calls | **N/A** — tool is read-only; iterates the fractal tree in-memory and returns violations. |

### 4. `project-init` — **SAFE (fixed paths)**

| # | file:line | function | path expression | containment status |
|---|---|---|---|---|
| 1 | `project-init.ts` | `initProject` | `writeFile(join(projectRoot, '.filid', 'config.json'), ...)` | **SAFE** — fixed filename under `<projectRoot>/.filid/`. `projectRoot` is not itself caller-supplied at the MCP boundary in a traversal-exploitable way (it identifies the target project). |
| 2 | `project-init.ts` | `initProject` | `copyFile(templateSrc, join(projectRoot, '.claude', 'rules', 'filid_fca-policy.md'))` | **SAFE** — fixed destination path, fixed template source. |
| 3 | `project-init.ts` | `initProject` | `mkdir(..., { recursive: true })` for `.filid/`, `.claude/rules/` | **SAFE** — fixed directory structure. |

## Summary

- **Before this PR**: 1 unguarded traversal vector (`debt-manage.handleResolve`).
- **After this PR**: 0 unguarded traversal vectors in the 4 tools audited.
- **SSoT status**: `debt-manage.handleResolve` now routes through `src/mcp/tools/utils/fs-guard.ts::assertUnder`. `review-manage.handleCleanup` retains its inline guard; planned refactor to share the helper is tracked in T2 (PR#1 v0.1.10) Commit (a-d).

## Deferred — T1b Follow-up Ticket

The following MCP tools were **not** audited in T1 (they touch the filesystem minimally or via fixed paths). A T1b ticket MUST verify each before the v0.2.0 release:

- `cache-manage` — writes/reads cache entries under `.filid/cache/`.
- `doc-compress` — reads INTENT.md / DETAIL.md under project root (read-only?).
- `fractal-scan`, `fractal-navigate`, `drift-detect`, `lca-resolve`, `rule-query`, `coverage-verify`, `test-metrics`, `ast-analyze`, `ast-grep-search`, `ast-grep-replace` — mostly read-only, to be confirmed.
- `review-manage` refactor to share `assertUnder` helper (T2 Commit in PR#1 v0.1.10).

Any tool in the deferred list whose audit surfaces an unguarded write/unlink callsite MUST receive the same `assertUnder` treatment as `debt-manage` and be appended to this file in the T1b PR.
