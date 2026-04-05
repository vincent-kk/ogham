---
version: 1.0
status: active
updated: 2026-04-06
---

# SPEC-state — `.imbas/` Directory Layout and Config Schema

## Purpose

Documents the on-disk state managed by imbas: the `.imbas/` directory tree,
`ImbasConfigSchema`, and how each provider interacts with that state.

## `.imbas/` directory layout

```
.imbas/
├── config.json                       # global config (language, provider, defaults)
└── <PROJECT-KEY>/
    ├── cache/                        # Jira metadata cache (issue types, link
    │                                 # types, workflows). No-op for local.
    ├── issues/                       # LOCAL provider only
    │   ├── stories/                  # S-<N>.md
    │   ├── tasks/                    # T-<N>.md
    │   └── subtasks/                 # ST-<N>.md
    └── runs/
        └── <run-id>/
            ├── state.json
            ├── stories-manifest.json
            ├── devplan-manifest.json
            └── (various artifacts: reports, feedback, digest drafts)
```

`<PROJECT-KEY>` from `config.defaults.project_ref`; fallback `LOCAL` when
unset.

`issues/` exists only when `provider = "local"`. For Jira, the tracker is
the source of truth and no local issue files are written.

## `ImbasConfigSchema` (Zod)

Source of truth: `packages/imbas/src/types/config.ts`.

```ts
ImbasConfigSchema = z.object({
  version:  z.string().default('1.0'),
  provider: z.enum(['jira', 'github', 'local']).default('jira'),   // ← since v1.1
  language: LanguageConfigSchema.default({}),
  defaults: DefaultsConfigSchema.default({}),
  jira:     JiraConfigSchema.default({}),
  github:   GithubConfigSchema.optional(),                          // ← since v1.2
  media:    MediaConfigSchema.default({}),
});
```

- **`provider`** (added by RALPLAN v2 cycle): selects the tracker backend.
  Default `jira` for backward compatibility. Skills read this via
  `config_get` at Step 0 to route to the correct provider workflow.
- **`defaults.project_ref`**: project key. In Jira mode, it is the Jira
  project key (e.g., `PROJ`). In local mode, it is the directory name
  under `.imbas/`. Fallback `LOCAL`.
- **`language`**: issue content / documents / reports / skill language
  defaults. Provider-agnostic.
- **`jira`**: issue types, workflow states, link types. Used only in Jira
  mode; ignored by the local/github providers.
- **`github`** (added by v1.2 cycle, optional): `repo` (`owner/name`),
  `defaultLabels` (array, default `[]`), `linkTypes` (enum array, default
  all 5). Required when `provider === "github"`. Authentication uses
  ambient `gh auth` — no token field. On `gh label create` 403, the
  manifest skill fails fast with a scoped error and calls
  `run_transition` to the `blocked` state; see `SPEC-provider-github.md`.
- **`media`**: `scene-sieve` configuration for `/imbas:imbas-fetch-media`. Jira
  mode only in v1.

## Example: local-mode config.json

```json
{
  "version": "1.0",
  "provider": "local",
  "language": { "documents": "ko", "issue_content": "ko" },
  "defaults": {
    "project_ref": "MYPROJ"
  }
}
```

Result: issues are stored under `.imbas/MYPROJ/issues/{stories,tasks,subtasks}/`.

## Example: Jira-mode config.json (unchanged from v1.0)

```json
{
  "version": "1.0",
  "provider": "jira",
  "defaults": { "project_ref": "PROJ" },
  "jira": {
    "issue_types": { "story": "Story" },
    "workflow_states": { "done": "Done" }
  }
}
```

When the `provider` field is omitted, `ImbasConfigSchema.parse()` fills in
`"jira"` by default — existing v1.0 configs work unchanged.

## Example: github-mode config.json (since v1.2)

```json
{
  "version": "1.0",
  "provider": "github",
  "language": { "documents": "ko", "issue_content": "ko" },
  "defaults": { "project_ref": "ogham-org/ogham-app" },
  "github": {
    "repo": "ogham-org/ogham-app",
    "defaultLabels": ["imbas"],
    "linkTypes": ["blocks", "blocked-by", "split-from", "split-into", "relates"]
  }
}
```

Result: issues are created in `ogham-org/ogham-app`, tagged with
`imbas` + auto-managed `type:*` / `status:*` labels. No files are
written under `.imbas/<KEY>/issues/` — that tree is local-provider only.

## `config_get` / `config_set` tools

Both tools handle the `provider` field via the updated `ImbasConfigSchema`
with no handler code changes required. See `SPEC-tools.md` for the tool
inventory.

## Run state (`state.json`)

Unchanged from v1.0. The run state machine is provider-agnostic. Phase
progression (validate → split → devplan → manifest) works identically
for all providers; only the downstream write target differs.

## Manifest schemas

Unchanged from v1.0. `StoriesManifestSchema` and `DevplanManifestSchema` in
`src/types/manifest.ts` are already provider-agnostic via
`issue_ref: z.string().nullable()`. The RALPLAN v2 cycle made no schema
changes — verified by `git diff --stat packages/imbas/src/types/manifest.ts`.
