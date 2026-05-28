# MUTATE Mode — Workflow

Incremental pipeline for patching an existing vault dashboard. Load when SKILL.md routes to MUTATE mode (an existing `dashboard-spec.json` is present in the target).

MUTATE assumes infrastructure files (`graph-store.ts`, `body-cache.ts`, `search-service.ts`, `watcher.ts`, `routes/index.ts`, `api/client.ts`, `api/sse.ts`, `components/{HeaderBar,StaleBanner}.tsx`, etc.) were authored by CREATE and live in `<target>/`. Do not regenerate them unless the user explicitly asks. Touch only the spec-driven files (panels, dataDomain routes, aggregators, SearchBar mode toggle, Dashboard grid).

```
Phase 1  Domain Priming         (delta hint block)
Phase 2  Delegate to refine     (delta-only questions)
Phase 3  Spec Diff              (new spec → diff vs current)
Phase 4  Patch                  (surgical file changes, preserve USER-EDIT)
Phase 5  Rebuild & Hand-off     (incremental build, validate)
```

---

## Phase 1 — Domain Priming (delta)

### Algorithm

````
1. Read ../../knowledge/interview-hints.md verbatim.
2. Read existing <target>/dashboard-spec.json.
3. Compose <target>/.dashboard-priming.md with this structure:

     # Dashboard Interview Priming — MUTATE

     ## User Request

     <verbatim copy of the user's mutate request>

     ## Current Spec

     ```json
     <pretty-printed dashboard-spec.json>
     ```

     ## Hints

     <full content of interview-hints.md>

     ## Instructions

     - Focus the interview on the user's requested delta.
     - Do NOT re-ask questions whose answers are already in Current Spec above.
````

Including the current spec lets the interview skip redundant questions and typically reduces the budget from 5–7 (CREATE, hard cap 7) to 2–4 (MUTATE, hard cap 4).

---

## Phase 2 — Adopt refine's protocol in-session (delta-only)

**Slash-skill chaining is not supported inside an active skill.** Adopt `/maencof:refine`'s LLM-instruction protocol and run it in the current session, with the delta-only constraint applied via the priming file's "Instructions" section.

### Algorithm

```
1. Read `$CLAUDE_PLUGIN_ROOT/skills/refine/SKILL.md`.
   (Fallback: resolve relative to this skill's repo root if the env var is unset.
   Absolute paths are environment-specific and MUST NOT be hard-coded here.)
   The 5-phase contract summary lives in `../../knowledge/refine-protocol.md`
   — both CREATE and MUTATE reference the same file.
2. Read <target>/.dashboard-priming.md as the interview input.
3. Execute refine's Phase 1 + 2 + 2.5 with the user — capped at 4 questions
   total for MUTATE (vs 7 for CREATE). One question per turn.
4. Probe only the dimensions the user's request affects (e.g., a new panel
   only needs Dimensions + optional Search updates).
5. Execute refine's Phase 3 — output the delta as a refined prompt with the
   same section headings as CREATE (### Data / ### Dimensions / ### Insight
   Goal / ### Search), but ONLY for changed dimensions.
6. Write the refined delta to <target>/.dashboard-spec.draft.md.
7. Verify it exists and is non-empty. If missing: stop and report.
```

### Token-budget safety

If MUTATE's interview exceeds 4 questions, the change is large enough to warrant a fresh CREATE — surface this to the user before continuing. See "When MUTATE is the wrong tool" below.

---

## Phase 3 — Spec Diff

### Algorithm

```
1. Load existing <target>/dashboard-spec.json -> oldSpec
2. Parse <target>/.dashboard-spec.draft.md (delta)
3. Apply delta on oldSpec to produce newSpec
4. Compute structured diff:
   - panels added:    newSpec.panels - oldSpec.panels (by id)
   - panels removed:  oldSpec.panels - newSpec.panels (by id)
   - panels modified: same id, different kind/dataDomain/layout
   - search changed:  oldSpec.search != newSpec.search
   - dataDomains changed: similar
5. Show diff preview to the user (JSON diff format + per-file change list).
   When `search.modes` adds a mode that was previously absent (e.g.
   enabling `semantic` for the first time), append a one-line warning:
   "note: enabling new search.modes requires backend restart for
   /api/search dispatch to register them (routes/spec.ts mtime cache
   propagates without restart, but dispatch reads the boot-time snapshot)".
   Same warning applies when `vaultIndex` or `refresh` changes.
6. Ask: "Apply N file changes? [Y/n/edit]"
   - y    -> Phase 4 (default — also the headless auto-resolved choice)
   - n    -> abort, keep draft for re-run
   - edit -> open the proposed newSpec in $EDITOR, then re-validate via
            <target>/backend/src/spec-schema.ts::parseSpec +
            validateSpecRefs() + validateFromDomainDag(). On validation fail, print
            "validation error at {path}: {reason}" and prompt
            "[r] retry editor / [a] abort and keep draft":
              r -> re-open $EDITOR. Loop.
              a -> keep draft, abort the run.
            (interactive only; in headless mode this branch is unreachable —
             see SKILL.md Phase 0 headless detection. Headless runs auto-pick
             "y" and proceed; never spawn $EDITOR.)
7. Delete <target>/.dashboard-priming.md and <target>/.dashboard-spec.draft.md
```

### Schema validation

Use the Zod schema from `<target>/backend/src/spec-schema.ts` (already deployed). If validation fails on newSpec, print path + reason and stop — do NOT touch any files.

### Migrator

If `oldSpec.version < newSpec.version`, run the version migrator before diffing. See **../../knowledge/spec-schema.md** for migration paths.

---

## Phase 4 — Patch

### Algorithm

```
-1. Git safety check (before touching any file):
     - Probe whether <target> is inside a git work tree
       (`git -C <target> rev-parse --is-inside-work-tree`).
     - Not inside git:
         interactive: prompt "<target> is not under git; rollback after
                              failure may be incomplete. Continue? [Y/n]"
                              (default y).
         headless:   print one-line warning and continue.
     - Inside git, dirty (`git -C <target> status --porcelain` non-empty):
         interactive: prompt "uncommitted changes detected at <target>;
                              consider committing first. Continue? [Y/n]"
                              (default y).
         headless:   print one-line warning and continue.
     - Inside git, clean: silent. Proceed.
0. Write <target>/dashboard-spec.json.bak (rollback anchor)
1. For each added panel:
     - Author <PascalName>.tsx using the kind's pattern in ../../knowledge/visualization-catalog.md
     - Insert import + grid entry inside Dashboard.tsx AUTO-MANAGED regions
       (skill-managed; existing content is replaced, not preserved)
2. For each removed panel:
     - Delete component file
     - Remove import + grid entry from Dashboard.tsx AUTO-MANAGED regions
3. For each modified panel:
     - Re-author component file (preserve USER-EDIT regions verbatim;
       AUTO-MANAGED regions inside the component, if any, are re-derived)
     - Update grid entry inside Dashboard.tsx AUTO-MANAGED panel grid if
       layout changed
4. For search changes:
     - Do NOT patch SearchBar.tsx — it self-configures from GET /api/spec.
       Spec changes propagate automatically once dashboard-spec.json is
       rewritten in step 6: routes/spec.ts uses an mtime cache (see
       ../create/workflow.md Phase 4 Turn 5) so the next /api/spec
       request returns the new search config without backend restart.
     - No route patching needed — routes/spec.ts re-reads the spec
       on mtime change.
     - Caveat: routes/search.ts dispatch and other routes that read
       app.spec.* at request time use the boot-time snapshot. A
       search.modes change that *adds* a previously absent mode (e.g.
       enabling semantic for the first time) requires backend restart
       for dispatch to register the new mode. Flag this in the
       hand-off summary when applicable.
5. For dataDomain changes (when fromDomain chains exist, iterate in
   `validateFromDomainDag(newSpec).authorOrder` — RECOMPUTE it from newSpec;
   it is a transient return value, never persisted in dashboard-spec.json;
   see ../create/workflow.md Phase 4 Turn 7):
     - For each ADDED dataDomain:
         * Author routes/<kebab>.ts + services/aggregator-<kebab>.ts
           (../create/workflow.md "Domain Route Pattern" + "Aggregator
           Pattern").
         * Patch routes/index.ts AUTO-MANAGED regions (import + register
           lines).
     - For each REMOVED dataDomain:
         * Delete routes/<kebab>.ts and services/aggregator-<kebab>.ts.
         * Remove the corresponding import + register lines from
           routes/index.ts AUTO-MANAGED regions.
     - For each MODIFIED dataDomain (same name; changed aggregate /
       filterIntent / layer / window / fromDomain / parser / topN):
         * Re-author services/aggregator-<kebab>.ts. The aggregator body
           is AUTO-MANAGED; the trailing USER-EDIT "post-aggregate
           transform" block is preserved verbatim.
         * Re-author routes/<kebab>.ts. The route body is AUTO-MANAGED;
           the USER-EDIT "<kebab> node selection" `layerFilter` literal
           is preserved.
         * routes/index.ts unchanged (import name stable).
     - For `fromDomain` chains:
         * When a parent's contract changes (e.g. its aggregate output
           shape), re-author every descendant in the chain in
           topological order.
         * When `fromDomain` itself is added/removed for a domain,
           treat it as a MODIFIED dataDomain — re-author both route
           and aggregator.
6. Replace <target>/dashboard-spec.json with newSpec
7. Run validation (Phase 5 pre-checks)
```

### Sentinel preservation rules

Generated files include two kinds of sentinels — see
`../create/workflow.md` "Sentinel kinds — split-responsibility rule" for the
authoritative table.

```typescript
// AUTO-MANAGED-START: <reason> (managed by craft-dashboard; do not hand-edit)
//   ... skill rewrites the lines between markers on every patch ...
// AUTO-MANAGED-END

// USER-EDIT-START: panel customization
//   ... user-tuned dataKey, color mapping, etc ...
// USER-EDIT-END
```

MUTATE rewrites lines inside AUTO-MANAGED markers freely and preserves lines
inside USER-EDIT markers verbatim across patches.

**Sentinel-missing protocol**: If an AUTO-MANAGED or USER-EDIT sentinel is missing in an existing file (because the user manually removed it), follow this staged fallback before stopping:

1. **Heuristic placement**: Compute a candidate location for the missing sentinel block:
   - `Dashboard.tsx` panel imports → end of the last `import ... from '../components/...'` line
   - `Dashboard.tsx` panel grid → inside the first `<section className="grid bento">` after the last `</div>` of an existing panel
   - `routes/index.ts` domain route imports → end of the last `import ... from './<name>.js'` line in the import block
   - `routes/index.ts` domain route registrations → end of `mountRoutes(...)` body, before the closing `}`
   - panel `<PascalName>.tsx` USER-EDIT zones → at the documented anchor (e.g., immediately after the `useQuery(...)` call for `dataKey` tweaks)
2. **Single-confirm prompt** (interactive only): Show the user the proposed
   sentinel insertion with the surrounding 3 lines of context. Ask
   `Insert sentinel here and proceed? [y/N]` (destructive-safe default).
3. **Headless run**: do NOT auto-resolve to `N` and silently continue. The
   patch run aborts immediately with a non-zero exit before
   `dashboard-spec.json` is rewritten in Phase 4 step 6. Print the missing
   sentinel reason and the recovery commands the user can run after
   restoring the markers manually.
4. **Interactive `y`**: Insert sentinel block, proceed with patch. Note in
   the hand-off summary that a sentinel was recovered.
5. **Interactive `N` or non-response**: Skip THAT file's patch, do NOT
   modify it. Surface the file name and the missing sentinel reason
   inline. Immediately ask a second prompt:
   `Continue patching the remaining N-1 files (spec change will be
partial)? [y/N]`.
   - **second prompt `N` / non-response**: abort the WHOLE MUTATE run
     BEFORE `dashboard-spec.json` is rewritten in Phase 4 step 6. Exit
     non-zero. Hand-off summary lists every file that would have been
     touched, marked as `not applied`.
   - **second prompt `y`**: continue patching the remaining files,
     rewrite `dashboard-spec.json` as usual, but the Phase 5 hand-off
     summary MUST flag the skipped file with a `partial spec
application` warning and recommend the user restore the sentinel
     and re-run MUTATE for that single file.

The fallback prefers progress with a single approval over a hard stall in
interactive mode, while in headless mode it refuses to leave the
spec-vs-code state diverged — silent partial application is forbidden.

### File naming conventions

MUTATE follows the same conventions as CREATE:

- Panel `id` → `frontend/src/components/<PascalCase>.tsx`
- Data domain `name` → `backend/src/routes/<kebab-case>.ts`

When a panel `id` is renamed in the spec, treat it as remove + add (don't try to rename in place — too error-prone with user edits).

---

## Phase 5 — Rebuild & Hand-off

### Algorithm

```
1. cd <target>/backend && npm run build    (incremental, background job)
2. cd <target>/frontend && npm run build   (incremental, background job)
3. Validation checks (see "Validation Checklist" below)
4. Print hand-off recipe with delta summary
5. Do NOT start a long-running server.
```

### Hand-off message

```
Dashboard updated at <target>.

Changes applied:
  + 2 panels added (TagTreemap, UncoveredTagsList)
  - 1 panel removed (LegacyHeatmap)
  ~ 1 panel modified (ActivityByLayer — layout col-12 → col-6)

Dev mode:   cd <target> && make dev-backend  (terminal 1, Fastify on 5174)
            cd <target> && make dev-frontend (terminal 2, Vite on 5173)
            Open: http://127.0.0.1:5173  (Vite proxies /api to 5174)

Prod mode:  cd <target> && make serve
            Open: http://127.0.0.1:5174

Spec reload:  /api/spec uses mtime cache — search.modes/fields/fuzzy
              changes apply on the next request without restart.
              vaultIndex / refresh / dataDomain dispatch changes
              require backend restart (kill + relaunch).

Backup of previous spec: <target>/dashboard-spec.json.bak
```

### Failure handling

- `npm run build` fails: print TypeScript errors, ask the user to inspect.
  Spec is already swapped — restore via rollback if needed (see "Rollback"
  below). Re-entry options once investigated:
  - Spec needs more changes → re-run `/maencof:craft-dashboard mutate <target>`.
  - Generated code only → `cd <target> && npm run build` after manual fix.
- Validation fails: print the specific failure, leave `dashboard-spec.json.bak`
  in place for rollback.

---

## Validation Checklist (used by Phase 5)

```
[ ] dashboard-spec.json parses as JSON
[ ] dashboard-spec.json validates against schema (../../knowledge/spec-schema.md)
[ ] All panels[i].component files exist
[ ] All dataDomains[i].route files exist
[ ] Removed panels' component files are actually deleted
[ ] USER-EDIT sentinels preserved verbatim in all retained files
[ ] AUTO-MANAGED sentinels still present (skill rewrote their interior, did not delete the markers)
[ ] No <target>/.dashboard-*.md leftover (priming + draft cleaned up)
[ ] frontend build output present in backend/app/static/
[ ] <target>/dashboard-spec.json.bak exists (rollback anchor)
```

Fail loudly. Do not mark complete on partial success.

---

## Rollback (MUTATE)

If MUTATE fails or the user wants to undo:

1. Restore `<target>/dashboard-spec.json` from `<target>/dashboard-spec.json.bak`.
2. If `<target>` is a git repo: `git restore <target>/backend <target>/frontend` to revert patched source files.
3. If not a git repo: previous component files are gone. Surface this risk to the user before running MUTATE; recommend committing to git first.

The `.bak` file is always written at the start of Phase 4 and is NOT deleted after success — keep it for the user to inspect or remove manually.

---

## When MUTATE is the wrong tool

Switch to a fresh CREATE if:

- The user wants to change the underlying stack (e.g., Recharts → Plotly globally)
- More than ~50% of panels are being replaced
- Vault indexing strategy changes (`maencof` ↔ `independent`)
- refine's question budget exceeds 4 in Phase 2 (matches the Phase 2 cap)

In these cases, recommend: backup current `<target>/`, then re-run with `create` subcommand into a fresh directory.

---

## Examples

End-to-end MUTATE walkthroughs live in **examples.md** in this directory. Load when you need a concrete delta pattern.
