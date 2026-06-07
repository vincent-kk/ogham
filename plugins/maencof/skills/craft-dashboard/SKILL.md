---
name: craft-dashboard
user_invocable: true
description: '[maencof:craft-dashboard] Generates or updates a personal vault dashboard from an interactive interview. Defaults to reading .maencof/ graph indexes; falls back to a vault file walk with --vault-index independent.'
argument-hint: '[create|mutate] [target-dir] [--chart recharts|plotly] [--search fuse|kg|both|off] [--vault-index maencof|independent] [--pin <version>] [--no-run-skill] [--yes]'
version: '0.1.0'
complexity: complex
context_layers: [2, 3, 4, 5]
orchestrator: craft-dashboard skill
plugin: maencof
---

# craft-dashboard

Builds a personal vault dashboard (Fastify backend + React 19 + Vite 6 frontend) through an interactive interview. Designed to mirror falias's proven SSE-driven dashboard pattern while being vault-agnostic and panel-configurable.

This SKILL.md is a **router**. It detects which mode applies, then loads exactly one method workflow. Do not duplicate phase content here.

## When to Use

### Auto-trigger Conditions

Claude automatically invokes this skill when:

- User asks to create, build, or generate a dashboard for their vault
- User requests changes to an existing dashboard (add panel, change chart, tweak search)
- User mentions visualizing vault activity, tags, layers, links, or insights with a UI
- The cwd or a specified target contains `dashboard-spec.json` and the user references "dashboard"

### Manual Invocation

```
/maencof:craft-dashboard
/maencof:craft-dashboard create ./dashboard
/maencof:craft-dashboard mutate ./dashboard --chart plotly
```

## Operating Modes

| Mode     | Trigger                                                                           | Workflow                                       |
| -------- | --------------------------------------------------------------------------------- | ---------------------------------------------- |
| `CREATE` | "make a dashboard", "create dashboard", target has NO `dashboard-spec.json`       | Full pipeline → scaffold backend + frontend    |
| `MUTATE` | "modify dashboard", "add panel", "change chart", target HAS `dashboard-spec.json` | Incremental patch → preserve USER-EDIT regions |

## Phase 0 — Mode Detection

```
1. Parse CLI args:
   - subcommand: create | mutate | (none -> infer)
   - target:     positional arg | cwd + "./dashboard"
   - flags:      --chart, --search, --vault-index, --pin, --yes
2. Detect headless mode:
   - headless == true  IF  --yes given
                       OR  process.env.CI === 'true'
                       OR  process.env.MAENCOF_YOLO === '1'
                       OR  process.stdin.isTTY === false
   - Prompt notation in headless:
       [Y/n]        -> auto-resolves to 'y' (the affirmative default)
       [y/N]        -> auto-resolves to 'N' (destructive-safe default).
                        The skill prints one warning line and continues
                        as if the user picked the default.
       [Y/n/edit]   -> the "edit" branch requires $EDITOR (interactive
                        only) — headless auto-resolves to 'y' (skip edit).
   - Use [Y/n] for non-destructive proceed prompts (mode confirm, vault
     sanity, spec OK?). Use [y/N] only when the affirmative branch could
     overwrite user work or skip a safety check (sentinel-missing recovery,
     `--vault-index independent` over an existing maencof index, etc.).
3. Resolve target to absolute path.
4. Inspect target:
   a. target/dashboard-spec.json exists      -> MUTATE
   b. target/ exists and non-empty           -> ask user (overwrite vs new sibling)
                                                (headless: pick overwrite)
   c. else                                   -> CREATE
4.5. Vault sanity check (resolve vault path from --vault flag, env
     VAULT_ROOT, or parent of target):
     - vault/**/*.md count == 0 AND vault/.maencof/nodes.json missing
       -> warn: "vault appears empty; dashboard will render no data".
       interactive: "Continue anyway? [Y/n]"
       headless: print warning and proceed.
     - vault path does not exist -> abort with non-zero exit
       (do not auto-create vault directories).
5. If subcommand explicit, override detection. On mismatch:
   - subcommand "create" but spec exists ->
       interactive: prompt "[o] overwrite (re-scaffold entire dest) /
                          [a] abort". Default 'a'.
       headless: abort with exit 2.
   - subcommand "mutate" but spec missing ->
       interactive: prompt "[c] switch to create here / [a] abort".
                    Default 'a'.
       headless: abort with exit 2.
6. Confirm: "Will operate in {mode} mode on {target}. Proceed? [Y/n]"
   (headless: auto-y, log the decision).
7. After confirmation, ensure <target> exists on disk: `mkdir -p <target>`.
   Subsequent Phase 1 writes (`.dashboard-priming.md`,
   `.dashboard-spec.draft.md`) assume the directory is present.
```

### Edge cases

- `target` ends with trailing slash → normalize
- `target` is inside the vault (`.maencof/` is sibling) → allowed but warn about size impact
- `target` does not exist → create after confirmation
- User passes `--vault <path>` separately → store in spec; default is "vault = parent of target"

## Phase 1+ — Route to Method Workflow

After Phase 0, **load exactly one method workflow** and follow it end-to-end:

- `mode == CREATE` → load **methods/create/workflow.md** (and **methods/create/examples.md** on demand)
- `mode == MUTATE` → load **methods/mutate/workflow.md** (and **methods/mutate/examples.md** on demand)

Do not preload both. Do not re-implement phases from the wrong workflow.

## Boundaries (common to both modes)

### Always do

- Run the interview loop inline by adopting `/maencof:refine`'s 5-phase protocol (Read its `SKILL.md`, execute Phases 1-4 in-session) — never invoke `/maencof:refine` as a sub-skill
- Treat the vault and `.maencof/` as read-only from the generated dashboard
- Write only inside `<target>/` (the dashboard output directory) — the sole exception is the one generated run-skill, written to `<vault>/.claude/skills/` after confirmation (see "Ask first")
- Honor the user's chart/search/vault-index CLI flags over defaults
- Preserve `// USER-EDIT-START` / `END` regions during MUTATE patches

### Ask first

- Overwriting an existing `dashboard-spec.json` without backup
- Changing the target directory after Phase 0 confirmation
- Running `npm install` (network call) — confirm if the user has constraints
- Writing the generated run-skill to `<vault>/.claude/skills/run-<name>/` (outside `<target>`) — confirm before writing; `--no-run-skill` skips it, and an existing same-named skill is overwritten only on explicit `[y/N]`

### Never do

- Modify `.maencof/` or vault markdown from inside the generated dashboard
- Run a long-lived dev server inside the Claude Code session during scaffold (the generated run-skill launches it later as a background job — that is the run-skill's job, not craft-dashboard's)
- Bundle UI design tokens or color palettes — those are user-chosen
- Replace the caret-pinned majors in `templates/{backend,frontend}/package.json` with floating `"latest"` unless `--pin <version>` requests a deliberate snapshot

### Dependency version policy

- Major versions of stack-defining libraries (Fastify 4, React 19, Vite 6, TypeScript 5, Zod 3, TanStack Query 5) are caret-pinned (`^N`) in the templates to preserve API compatibility.
- **Framework-coupled plugins** are co-pinned to the highest plugin major that still supports the framework's pinned major, NOT `"latest"` — a plugin's newest major routinely drops the older framework, and `--force`/`--legacy-peer-deps` only mask the break. Fix the pin instead. Co-bump a plugin only when bumping its framework.
  - Fastify plugins (`@fastify/static ^7`, `@fastify/cors ^8`, `fastify-sse-v2 ^4`) target the Fastify-4-compatible majors. Each enforces its Fastify range at `app.register()` time, so a `"latest"` (Fastify-5-only) plugin crashes the backend at boot with `FST_ERR_PLUGIN_VERSION_MISMATCH` (install + `tsc` still pass — it only fails when the server runs).
  - The Vite plugin (`@vitejs/plugin-react ^5`) targets the Vite-6-compatible majors. `@vitejs/plugin-react@latest` (6.x) declares `vite ^8` as its peer, so against the pinned `vite ^6` it fails `npm install` with an `ERESOLVE` peer conflict. v5 is the highest major whose peer range still includes `vite ^6`.
- Minor/patch versions of leaf libraries (chokidar, gray-matter, markdown-it, recharts, zustand, dayjs, etc.) ship as `"latest"` so the user's first `npm install` writes a fresh lockfile.
- `--pin <version>` is an optional override that rewrites every `"latest"` to the given concrete version (and is allowed to override caret-pinned majors when the user explicitly opts in).

## Skill Chaining

```
craft-dashboard
   ├── adopts /maencof:refine's protocol in-session (Read SKILL.md, run Phases 1-4)
   ├── reads .maencof/{nodes,edges}.json (read-only) when --vault-index maencof
   └── (optional) imports @ogham/maencof spreading-activation for semantic search
```

Slash-skill chaining is not supported inside an active Claude Code skill, so craft-dashboard does NOT invoke `/maencof:refine` as a sub-skill. It reads refine's `SKILL.md` and executes refine's documented 5-phase interview protocol inline. See `methods/create/workflow.md` Phase 2 for the inlined contract.

No other skills are invoked.

## Quick Reference

```bash
# Create with all defaults
/maencof:craft-dashboard create ./dashboard

# Create with Plotly + lexical-only search
/maencof:craft-dashboard create ./dashboard --chart plotly --search fuse

# Mutate an existing dashboard
/maencof:craft-dashboard mutate ./dashboard

# Independent indexing (vault without maencof)
/maencof:craft-dashboard create ./dashboard --vault-index independent
```

## Resources

### methods/

Mode-specific workflows. Load exactly one per session based on Phase 0 outcome.

- **methods/create/** — CREATE pipeline (`workflow.md`, `examples.md`)
- **methods/mutate/** — MUTATE pipeline (`workflow.md`, `examples.md`)

### knowledge/

Domain knowledge shared by both modes. Load specific files on demand; do not preload.

- **interview-hints.md** — Hint block prepended to refine in Phase 1
- **spec-schema.md** — `dashboard-spec.json` schema with examples
- **vault-indexing.md** — Option D implementation: GraphStore hot-reload, body LRU, stale banner, SA fallback
- **visualization-catalog.md** — Dimension → chart mapping (Recharts components + Plotly fallback)
- **search-design.md** — Fuse.js config, SA port, tag/backlink index shape

### templates/

**Boilerplate + entry shells only.** No file-level `.tmpl` templates. Infrastructure and spec-driven files are authored by the LLM at scaffold time, against contracts encoded in the entry shells.

- `backend/` — Fastify entry shell (`server.ts` — owns CORS, free-port fallback, `.dashboard-runtime.json`, and `DASHBOARD_OPEN` browser launch; `fastify-decorators.d.ts`, `markdown-it-task-lists.d.ts` ambient shim) + package/tsconfig + `.npmrc`
- `frontend/` — Vite + React 19 entry shell (`main.tsx`, `App.tsx`, `pages/Dashboard.tsx` placeholder, `vite.config.ts` — proxy follows `DASHBOARD_API_PORT`, auto-opens browser) + styles, package/tsconfig + `.npmrc`
- `scripts/read-api-port.mjs` — reads `.dashboard-runtime.json` so `make dev-frontend` aligns the Vite proxy with the backend's actual port (copied to `<target>` in CREATE Phase 4 step 0)
- The vault run-skill is **not** a template file: CREATE Phase 5 authors it into `<vault>/.claude/skills/run-<name>/SKILL.md` from the pattern in `methods/create/workflow.md` "Run-skill generation" (skip with `--no-run-skill`)
- `Makefile`, `package.json` (workspaces), `README.md`, `.gitignore`, `.npmrc` (all copied to `<target>` in CREATE Phase 4 step 0)

The entry shells import infrastructure modules (`./graph-store.js`, `./api/client`, `./components/SearchBar`, etc.) that do **not** yet exist in templates. CREATE Phase 4 step 2-3 authors them; MUTATE reuses what CREATE left in `<target>/`.
