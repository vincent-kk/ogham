<!-- Loaded on demand by skills/migrate/SKILL.md when the `l4-archive` option is selected. -->

# l4-archive — Legacy L4 Archive → 99_Archive/actions Relocation

Relocates the L4 expired-document archive from the legacy metadata location
`.maencof-meta/archive/04_Action/` to the vault store `99_Archive/actions/`
and rewrites every in-place stub's `archive_path` to match. Since maencof
0.14.0 the `archiveExpired` boot hook writes new expiries directly to
`99_Archive/actions/` and treats the legacy root as a read-only backfill
fallback; this migration converges an existing vault on the new canonical
location so the fallback has nothing left to serve.

The mechanical work is done by the bundled zero-dependency script — run it
via Bash, never load it into context:

    node "${CLAUDE_PLUGIN_ROOT}/skills/migrate/scripts/l4-archive-relocate.mjs" \
      "<vaultPath>" [--execute] [--report <file>]

When `${CLAUDE_PLUGIN_ROOT}` is unset, locate it with
`Glob(**/skills/migrate/scripts/l4-archive-relocate.mjs)`. Default mode is a
dry-run that never writes. Exit codes: 0 ok · 1 execution failure ·
2 input/precondition error · 3 collision. Git is the rollback mechanism (no
WAL).

Ordering: the plugin must be >= 0.14.0 with its MCP restarted BEFORE this
migration runs. The reverse order is data-safe (the new backfill reads the
legacy root), but an old hook booting after the relocation would archive new
expiries back into the legacy root, splitting the archive again.

Flags: `--dry-run` stops after Phase D (the script's default mode — report
only, no writes); `--rollback` skips to the Rollback section (git-based —
the script itself has no rollback mode).

## Preflight (abort on any failure, report why)

1. Plugin version >= 0.14.0 (plugin manifest or `kg_status` server info).
2. The vault is a git repository with a CLEAN working tree (`git status`).
   Non-git vault: take a full vault backup first and note that rollback is
   manual restore from that backup.
3. Exclusive vault access (shared constraint) — also ask the user to close
   Obsidian or other vault-watching apps.

## Phase D — Discovery (read-only)

1. Run the script WITHOUT `--execute` (dry-run) and with
   `--report "<vault>/.maencof-meta/tmp/l4-relocate-report.json"`. The last
   stdout line is a JSON payload: `moves` (originals to relocate),
   `stubRewrites` (stubs whose legacy `archive_path` prefix will be
   rewritten), `anomalies`, `collisions`.
2. Review the report's full lists. An original WITHOUT a stub is not an
   anomaly (the >= 0.14.0 backfill recreates missing stubs on the next boot,
   and harvest legitimately deletes stubs of harvested topics). Reported
   anomalies — a stub whose original exists in NEITHER root, or an archived
   stub without `archive_path` — are left untouched by the script; list them
   for manual review. Any collision must be resolved before Phase X.
3. Present the counts with the anomaly/collision details and require
   explicit user approval (AskUserQuestion) before Phase X.

## Phase X — Execute (in order)

1. **Run the script with `--execute`** (keep `--report`): it moves every
   `.maencof-meta/archive/04_Action/<rel>` original to
   `99_Archive/actions/<rel>` (subdirectory structure preserved), rewrites
   the legacy `archive_path` prefix in every Phase D stub (frontmatter and
   body callout lines — the `<rel>` tail is preserved), and removes the
   emptied legacy directories. Sibling legacy directories (`digested/`,
   `harvested/`, `legacy-l3-cve/`) stay untouched. On exit 3 (collision) or
   exit 1 (failure) stop — restore with git and report. Verify the payload's
   `moved`/`rewritten` equal the Phase D `moves`/`stubRewrites`.
2. **Vault-owned files** (propose each edit, apply only with user approval —
   these files are vault property, mirroring the publication migration's
   redirection step):
   - `.claude/skills/archive-harvest/SKILL.md`: Phase A (archiving) is now
     owned by the plugin's `archiveExpired` boot hook — restate the skill as
     Phase B (harvest) only. Update paths: trigger/scan
     `archive/04_Action/{topic}/` → `99_Archive/actions/{topic}/`,
     post-harvest move `archive/harvested/{topic}/` →
     `99_Archive/harvested/{topic}/`, and stub `archive_path` values now
     point into `99_Archive/actions/`. Delete any stale background note
     claiming no automatic L4→archive logic exists in maencof.
   - `.maencof-meta/lifecycle-rules.json`: in rule `expire-l4-action`, set
     `archive_prefix` to `"99_Archive/actions/"`.

## Phase R — Post-migration (in order)

1. Rebuild: `mcp__plugin_maencof_tools__kg_build` with `force: true`.
2. Verify: `kg_status` archived-stub count equals the Phase D stub count
   (stubs stay in the graph); `/maencof:checkup` classifies links into
   `99_Archive/` as informational archive-references, never broken links.
3. Restart the MCP once and confirm the backfill changed nothing beyond
   healing: no legacy root recreated, and new files under `04_Action/` only
   for originals Phase D reported as stub-less (those gain stubs with the
   new `99_Archive/actions/` prefix — the invariant healing itself).
4. Commit everything as ONE commit (moves, stub rewrites, vault-file edits)
   with a summary: N originals moved, N stubs rewritten. On any mismatch in
   steps 2–3, do NOT commit — report the numbers and stop.
5. Optional follow-ups to propose (separate decisions, outside this
   migration): relocate `harvested/` to `99_Archive/harvested/` and rewrite
   `[[archive/harvested/...]]` references in L2 insights; converge
   `digested/` and `legacy-l3-cve/` (publication-nature) into `99_Archive/`
   series directories via the `publications` option; remove
   `.maencof-meta/archive/` once fully empty.

## Rollback

Single-commit design: `git revert <migration commit>` restores the legacy
layout. For an uncommitted partial state, `git reset --hard` plus
`git clean -fd` — safe only because Preflight required a clean tree. The
`archiveExpired` hook (`>= 0.14.0`) remains compatible with the restored
legacy layout through its read-only backfill fallback.
