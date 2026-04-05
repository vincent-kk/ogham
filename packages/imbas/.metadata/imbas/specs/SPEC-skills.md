---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-skills — Skill Routing and Reference Partitioning

## Purpose

Documents per-skill provider divergence, which skills are partitioned vs
inline-branched, the reference directory layout, and the verbatim
`SKILL.md` standard block.

## Per-skill divergence (RALPLAN v2 cycle, 2026-04-06; updated v1.2 2026-04-06)

Partitioning threshold: partition when per-provider delta exceeds
**15 lines**. Below the threshold, handle divergence via inline branching.

| Skill         | Delta        | Status (v1.2)        | Notes |
|---------------|--------------|----------------------|-------|
| `manifest`    | ~60 lines    | **PARTITIONED** (jira, local, github) | create-issue vs file-write vs gh CLI + bidirectional links + body `## Links` section |
| `read-issue`  | ~30 lines    | **PARTITIONED** (jira, local, github) | `getJiraIssue` vs `Glob+Read+frontmatter` vs `gh issue view --json` + digest last-wins |
| `digest`      | ~20 lines    | **PARTITIONED** (jira, local, github) | comment vs `## Digest` append vs `gh issue comment` + HTML marker |
| `devplan`     | 36 lines     | **PARTITIONED** (jira, local, github) | feedback_comment target_ref + final message; measured 2026-04-06 during v1.2 cycle via `diff -u jira local \| grep -E '^[+-]' \| wc -l` (36 > 15 threshold — partition retained for github) |
| `status`      | 0 lines      | **INLINE / no split**| Planned ~45 lines, actual 0. Reads only run/manifest state. |
| `split`       | ~18 lines    | **INLINE** (borderline) | Re-evaluate if divergence grows |
| `setup`       | ~22 lines    | **INLINE** (borderline) | Re-evaluate if divergence grows |
| `validate`    | ~8 lines     | **INLINE**           | Below threshold |
| `cache`       | ~5 lines     | **INLINE**           | Local is a one-line no-op guard |
| `fetch-media` | 0 lines      | **UNTOUCHED**        | Confluence-specific, Jira-only in v1 |
| `pipeline`    | 0 lines      | **UNTOUCHED**        | Orchestrator; propagates `config.provider` |

### Deviation from plan

The plan's Phase C table estimated `status` at ~45-line divergence.
Inspection during Phase C4 showed the actual delta is 0 lines because
`status` reads only `run_get`, `run_list`, `manifest_get` — all
provider-agnostic — and displays counts derived from `issue_ref`
presence, which is provider-agnostic by schema. Documented at the top of
`skills/status/references/subcommands.md` as an honest deviation.
Partitioning was skipped for this skill.

## Reference directory layout — standard (partitioned skills)

```
skills/<skill>/
├── SKILL.md                         # provider-agnostic skeleton + anchor block
└── references/
    ├── workflow.md                  # provider-agnostic skeleton
    ├── tools.md                     # shared imbas MCP tools (config_get, ...)
    ├── errors.md                    # provider-agnostic errors
    ├── (other shared files)         # state-transitions.md, preconditions.md, etc.
    ├── jira/
    │   ├── workflow.md
    │   ├── tools.md
    │   └── errors.md
    └── local/
        ├── workflow.md
        ├── tools.md
        ├── errors.md
        └── (helper files — id-allocation.md, file-format.md, link-handling.md
             for manifest; others as needed per skill)
```

### Hard rules

- **`references/github/**` partitioning follows the same 15-line threshold**
  as jira/local (authored during the v1.2 cycle; see the Per-skill divergence
  table above for current status).
- **No `references/provider-routing.md`** anywhere. Dispatch logic lives in
  the SKILL.md anchor block only.
- **Context isolation > DRY**: if shared content is ambiguous, duplicate
  into each provider subdirectory rather than placing in the flat root.

## Standard SKILL.md anchor block

Inserted immediately after the `## References` section. The anchor
comment is literal; the block text below it is copied verbatim.

```markdown
<!-- imbas:constraints-v1 -->
## Workflow (Provider-agnostic skeleton)

1. Load inputs via imbas_tools.
2. Read `config.provider` via `config_get`.
3. Load ONLY the provider-specific workflow file matching `config.provider`:

   | provider | workflow file |
   |---|---|
   | `jira`   | `references/jira/workflow.md` |
   | `github` | `references/github/workflow.md` |
   | `local`  | `references/local/workflow.md` |

4. Execute those steps exactly.
5. Persist outputs via imbas_tools.

## Constraints

- When running as provider X, MUST NOT read any file under `references/Y/**` for any other Y.
- Provider-specific tools (atlassian__* for jira, `gh issue *` / `gh label *` / `gh api` via Bash for github, Read/Write/Edit for local) MUST only be invoked from within the matching `references/<provider>/` workflow.
```

Individual skills may adapt Steps 1/4/5 wording to their specific inputs
and outputs (e.g., devplan loads both stories-manifest and run state in
Step 1), but the anchor comment, dispatch table, and Constraints
directives are fixed.

## Enforcement

- **Test**: `src/__tests__/skill-constraints-block.test.ts` — 20 assertions
  across the 4 partitioned skills verifying anchor presence, dispatch
  table rows (`jira`, `github`, `local`), Constraints section, and
  absence of raw tracker tokens in SKILL.md body outside the anchor
  block. Forbidden tokens cover both Jira MCP (`createJiraIssue`,
  `getJiraIssue`, `searchJiraIssuesUsingJql`, `addCommentToJiraIssue`,
  `transitionJiraIssue`) and gh CLI (`gh issue create`, `gh issue view`,
  `gh issue comment`, `gh issue close`, `gh label create`) — raw tokens
  must live inside `references/<provider>/**` only.
- **Deviation note**: skills marked INLINE or UNTOUCHED do NOT carry the
  anchor block. The test suite excludes them from assertions.

## Partitioned skill list (pinned)

- `manifest`
- `read-issue`
- `digest`
- `devplan`

Any change to this list (promoting a borderline skill, demoting a
partitioned skill, or adding GitHub) requires updating both the test's
`PARTITIONED_SKILLS` constant and this table.
