<!-- Loaded on demand by skills/migrate/SKILL.md when the `publications` option is selected. -->

# publications — Publication → 99_Archive + clusterseed Migration

Converts a legacy vault where publications (periodic feed documents: CVE
advisories, news items, digests, …) are scattered across layer directories
into the formalized structure:

- **Bodies** live under `99_Archive/<series>/` — outside the knowledge graph
  (not nodes; enumerable via `kg_search { cluster }`) by design (scan
  allowlist + node path gate), so they produce zero lexical noise.
  Explicit-path `read`/`update` still work on them.
- **One clusterseed anchor per series** at `03_External/clusterseeds/<key>.md`
  (`layer: 3` + `sub_layer: clusterseed` — both enforced by FrontmatterSchema)
  is the sole lexical entry point (R11 gate: ranked only when directly
  seeded). Its body carries pointers only — archive directory, filename
  pattern, an as-of date — never a member listing or exact totals that would
  go stale.
- **Distilled in-graph documents** (quarterly digests, insight rollups) are
  NOT moved; they get the series `cluster_key` stamped so collapse folds them
  behind one representative.
- After migration, NEW ingestion lands directly in `99_Archive/<series>/` —
  the migration emits a redirection report for the vault-owned ingestion
  skills (the platform cannot edit them).

The heavy lifting is done by the bundled script — run it via Bash, never load
it into context:

    node "${CLAUDE_PLUGIN_ROOT}/skills/migrate/scripts/publication-migrate.mjs" ...

When `${CLAUDE_PLUGIN_ROOT}` is unset, locate the script with
`Glob(**/skills/migrate/scripts/publication-migrate.mjs)`.

## Phase D — Discovery (agent-driven, read-only)

The platform cannot know vault-side ingestion scripts. Explore:

1. `.maencof-meta/data-sources.json` — registered sources and target prefixes.
2. Vault-side skill/knowledge docs that orchestrate ingestion (e.g.
   `.claude/skills/*/SKILL.md`, `knowledge/*-adapter.md`).
3. Serial content: date-stamped or ID-numbered filename runs under layer
   directories AND under `.maencof-meta/archive/**` (a de-facto legacy archive
   is also migration input — the user decided ALL publication-nature content
   converges on `99_Archive`).
4. Frontmatter shape per candidate series (`archived`/`archive_path` stubs vs
   bodies; distilled rollups that must stay in-graph).
5. Classify candidates operationally: MOVE candidates are raw feed items
   (identifier/date-stamped filenames, machine-written frontmatter, often
   layer 4 with `expires`); STAMP-ONLY candidates are distilled documents
   that must stay in the graph (digest/rollup/insight/summary/-cluster names,
   layer ≤ 3, human synthesis spanning many items). When unsure, propose
   STAMP-ONLY — a wrong stamp is trivially reversible, a wrong move removes
   knowledge from the graph.
6. Anchor `tags` guideline — the anchor is the sole lexical entry point and
   the R11 gate passes only on a direct seed match, so its tags must cover
   the vocabulary a user would actually type: include (a) the series key
   itself, (b) the domain nouns in BOTH the vault's working language and
   English, and (c) the most frequent tags shared by the series members.
7. Record in `sourceRefs` every vault-side ingestion script/config path found
   — the redirection report is generated from these.

Produce the config JSON (schema below), write it to
`<vault>/.maencof-meta/tmp/publication-migrate-config.json`, and present a
per-series summary table for user confirmation. Do not proceed unconfirmed.

## Config schema (v1)

```json
{
  "version": 1,
  "archiveRoot": "99_Archive",
  "series": [
    {
      "key": "<cluster_key, kebab-case>",
      "title": "<anchor title>",
      "anchor": {
        "path": "03_External/clusterseeds/<key>.md",
        "tags": ["<distinctive seed keywords…>"],
        "gist": "<one-line summary>",
        "description": "<1-2 sentences for the anchor body>"
      },
      "archiveDir": "<subdir under archiveRoot>",
      "moveSources": [
        {
          "dir": "<vault-relative dir>",
          "filePattern": "<JS regex, optional>",
          "recursive": false
        }
      ],
      "stampOnly": [
        { "dir": "<vault-relative dir>", "filePattern": "<JS regex>" }
      ],
      "excludePatterns": [
        "<JS regex, optional — matching filenames are never moved/stamped>"
      ],
      "sourceRefs": [
        "<vault-relative ingestion script/config paths found in Phase D>"
      ],
      "deleteStubs": true,
      "rewriteLinks": true
    }
  ]
}
```

Rules the script enforces:

- `anchor.path` must start with `03_External/clusterseeds/`; a pre-existing
  file at the anchor path is a COLLISION — there is deliberately no overwrite
  flag; resolve and rerun.
- `key` is stamped as `cluster_key` on the anchor, on every moved body, and
  on every stampOnly match. `excludePatterns` wins over any include match.
- Classification is two-pass. Pass 1 per file: unparseable frontmatter, OR
  `archived: true` without `archive_path`, OR `archived: true` with a
  normalized `archive_path` equal to its own path → ANOMALY; `archived: true`
  with a different `archive_path` → stub candidate; otherwise body. Pass 2
  per stub candidate: its normalized `archive_path` must exist on disk AND
  itself classify as body — otherwise ANOMALY (catches cross-referencing stub
  pairs whose real body exists nowhere). Anomalies are reported and left
  untouched.
- All paths are normalized before comparison (`./` prefixes, duplicate
  slashes); leading `/` or `..` segments are rejected (same principle as the
  engine's `isLayerDirPath`).
- An existing target path is a COLLISION: reported and skipped in dry-run;
  `--execute` re-checks immediately before each op, stops on the first
  collision with exit 3, and leaves the WAL `in_progress` for `--rollback`.

## Phase P — Dry-run (default mode)

    node "${CLAUDE_PLUGIN_ROOT}/skills/migrate/scripts/publication-migrate.mjs" \
      "<vaultPath>" --config "<configPath>" \
      --report "<vault>/.maencof-meta/tmp/publication-migrate-report.json"

Prints a JSON plan: per-series counts (bodies to move, stubs to delete,
stamps, link rewrites), anomalies, collisions, and the op list size; with
`--report` it also writes the FULL op list. No writes to the vault. Review
the full op list for non-publication strays (a filePattern over-match — scan
for filename shapes that differ from the series pattern), then present the
summary plus anomalies, collisions, and stray candidates. Require explicit
user approval (AskUserQuestion) before Phase X.

## Phase X — Execute

    node ... --execute [--report "<vault>/.maencof-meta/tmp/publication-migrate-report.json"]

WAL (`.maencof-meta/publication-migration-wal.json`, MigrationWAL-shaped) is
written before every op. Non-zero exit or `operationsFailed > 0` → stop and
offer `--rollback`. A mid-run stop (collision, crash) leaves the WAL
`in_progress`: either `--rollback` immediately, or remove the cause and rerun
after clearing the WAL — never leave the vault in the partial state.

## Phase R — Post-migration (in order)

1. Rebuild: call `mcp__plugin_maencof_tools__kg_build` with `force: true`;
   for very large moves follow `/maencof:build --force --reset-cache`.
2. Verify: `kg_search { seed: [<anchor tag>] }` surfaces the anchor;
   `kg_search { cluster: <key> }` returns anchor + stamped distilled docs;
   moved bodies are absent from the graph.
3. Redirection: the report's `redirection` section lists, per series,
   `{ key, ingestionTarget, anchorPath, sourceRefs }`. For each `sourceRefs`
   entry (the vault-owned ingestion scripts/configs found in Phase D), propose
   the exact edit that (a) repoints NEW ingestion to `ingestionTarget`
   (frontmatter kept, `expires` no longer needed) and (b) bumps the anchor's
   `updated` field — and its one-line summary when meaningful — on each
   ingestion run: the anchor is a pointer document, and keeping it fresh is
   the ingestion pipeline's job. Apply only with user approval — these files
   are vault property.
4. Propose adding `clusterseed` to the vault CLAUDE.md sub-layer enumeration
   if it lists allowed values.
5. Recommend `/maencof:checkup` (links into `99_Archive/` classify as
   informational archive-references, not defects).

## Rollback

    node ... --rollback

Replays `done` WAL entries in reverse (moves reversed, created files removed,
deleted stubs restored from their WAL content+mode snapshot, frontmatter
stamps and link rewrites inverted). Requires the same exclusive vault access
as the migration itself.
