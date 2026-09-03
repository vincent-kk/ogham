# @ogham/filid

A Claude Code plugin that keeps a codebase's module boundaries and contract documents honest.

As a codebase grows, AI agents lose context, documents drift from code, and directory structures lose their shape. filid answers exactly that, and only that, through **Fractal Context Architecture (FCA-AI)**: it owns `INTENT.md` and `DETAIL.md`, checks the fractal/organ structure and its dependency DAG, decides where a shared unit belongs, and reviews a change against that evidence.

filid is deliberately not a repository-wide code-quality rule engine. Outside the committed-change scope of cross-review, naming, function size, cyclomatic complexity, cohesion metrics, test quality, and coverage belong elsewhere. Within that scope, cross-review judges defects, security, performance, maintainability, tests, documentation, and FCA evidence; uncertain evidence remains explicit instead of becoming a guess.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Add the repository to your marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install filid
```

Skills, the MCP server, and hooks register automatically. No manual configuration needed.

### For Development (Local Setup)

```bash
# From monorepo root
yarn install

# Build the plugin
yarn filid build

# Load in Claude Code
claude --plugin-dir ./plugins/filid
```

Building produces:

- `bridge/mcp-server.cjs` — MCP server (9 tools)
- `bridge/{setup,user-prompt-submit,pre-tool-use}.mjs` — 3 hook scripts
- `public/settings.html` — the settings UI served by `open_settings`

There is no native dependency and no global module lookup: the plugin installs and runs with only the MCP SDK and Zod at runtime.

---

## How to Use

filid skills are **LLM prompts**, not CLI commands. Invoke them in Claude Code as natural language; plain sentences work as well as flags.

### Initialize a project

```
/filid:setup
/filid:setup ./packages/my-app
```

Writes `.filid/config.json`, deploys the managed FCA rule document, takes a structure snapshot, and proposes the `INTENT.md` / `DETAIL.md` files that are missing. It does not edit your existing documents.

### Audit the project

```
/filid:scan
/filid:scan src/core 쪽만 봐줘
```

The single full-project audit: node classification, document contracts, entry-point surface, external import boundaries, the real dependency DAG, and verification-document caps — all against one snapshot.

### Ask a scoped question

```
/filid:context-query src/core/restructure
/filid:guide organ 디렉터리엔 뭘 두면 돼?
```

`context-query` resolves a path to its owning fractal and the minimal owner-to-root document chain, then answers within three rounds. `guide` explains the current tree and placement rules without changing anything.

### Improve the documents

```
/filid:enrich-docs src/core
```

Improves `INTENT.md` / `DETAIL.md` from snapshot-backed evidence. You approve before any edit; structure is validated afterwards.

### Move code to where it belongs

```
/filid:restructure src/shared/formatDate.ts
```

Produces a read-only placement plan — `sourcePath → targetPath`, the basis for each move, the required documents and entry points, and the exact import rewrites. filid never moves your files: you (or an agent) execute the plan, and filid then verifies the postconditions exactly. A move that lands somewhere other than the plan is a FAIL even if it works.

### Review a change

```
/filid:cross-review
/filid:cross-review --base origin/main
```

Each committed file is reviewed against layered built-in and repository rules, while FCA tool findings join the same candidate set. Every candidate finding is independently verified as `CONFIRMED | REFUTED | INDETERMINATE`; only confirmed findings affect fix requests. The verdict is `APPROVED | REQUEST_CHANGES | INCONCLUSIVE` and covers the committed change, not defects outside that scope.

### Migrate legacy document names

```
/filid:migrate
```

Moves `CLAUDE.md` → `INTENT.md` and `SPEC.md` → `DETAIL.md` through a portable, dry-run-first script, then validates the result.

---

## What Runs Automatically

Three hooks fire without user intervention:

| Event              | What                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------- |
| `SessionStart`     | Initializes the session cache and detects whether this is an FCA project              |
| `UserPromptSubmit` | Resets the per-turn visit map and points at the FCA rules once per session            |
| `PreToolUse`       | Delivers the owning module's INTENT chain, and gates `INTENT.md` / `DETAIL.md` writes |

A blocked write explains its reason and denies only that one tool call — your turn continues.

---

## Skills Reference

| Skill                  | What it does                                                              |
| ---------------------- | ------------------------------------------------------------------------- |
| `/filid:setup`         | Initialize config and rule documents; propose missing INTENT/DETAIL       |
| `/filid:scan`          | The single full-project FCA audit                                         |
| `/filid:context-query` | Resolve a path to its owner fractal and minimal document chain            |
| `/filid:guide`         | Explain the current tree, classifications, and placement rules            |
| `/filid:enrich-docs`   | Improve INTENT.md / DETAIL.md from snapshot evidence, with approval       |
| `/filid:restructure`   | Read-only placement plan → approval → external execution → postconditions |
| `/filid:cross-review`  | File-by-file change review with independently verified findings           |
| `/filid:migrate`       | Migrate legacy CLAUDE.md / SPEC.md names                                  |
| `/filid:pull-request`  | Sync branch FCA documents, then open a structured GitHub PR               |
| `/filid:resolve`       | Decide each fix request, delegate corrections, record justifications      |
| `/filid:revalidate`    | Re-measure the correction delta and issue the final PASS or FAIL          |
| `/filid:pipeline`      | Run the whole merge-track cycle end to end, with resume support           |

---

## Key Rules

15 built-in rules, each backed by evidence filid can actually produce:

| Rule                       | What it checks                                                    |
| -------------------------- | ----------------------------------------------------------------- |
| `intent-document-contract` | INTENT.md ≤ 50 lines with the three boundary sections             |
| `detail-document-contract` | DETAIL.md required sections and acceptance groups                 |
| `organ-no-intentmd`        | No INTENT.md inside an organ directory                            |
| `entry-point-surface`      | The entry point's public surface can be enumerated                |
| `module-entry-point`       | Every fractal / hybrid node has an entry point                    |
| `max-depth`                | Configured tree depth                                             |
| `circular-dependency`      | No cycle in the real dependency graph                             |
| `pure-function-isolation`  | `pure-function` nodes import no fractal or hybrid module          |
| `zero-peer-file`           | No stray peer file at a fractal root                              |
| `external-import-boundary` | External consumers import the entry point, never internals        |
| `spec-document-case-cap`   | ≤ 15 semantic cases per spec document                             |
| `test-record-case-cap`     | ≤ 32 semantic cases per test record                               |
| `spec-fragmentation`       | One contract group is not split across spec files to dodge a cap  |
| `spec-contract-link`       | Multiple spec documents declare distinct DETAIL acceptance groups |
| `legacy-criteria-ledger`   | Reports a legacy `.filid/criteria.md` and its DETAIL.md target    |

A rule an adapter cannot measure exactly returns an `indeterminate` finding — never a PASS.

---

## MCP Tools

| Tool                 | Role                                               |
| -------------------- | -------------------------------------------------- |
| `project_init`       | Initialize FCA in a project                        |
| `rule_docs_sync`     | Sync the managed rule documents                    |
| `open_settings`      | Open the settings UI                               |
| `fractal_scan`       | Inspect the snapshot tree                          |
| `context_resolve`    | Batch owner/document chains from one snapshot      |
| `restructure_plan`   | Decide placement; returns a plan artifact          |
| `structure_validate` | Validate a project, or a plan's pre/postconditions |
| `verification_scan`  | Judge spec-document / test-record contracts        |
| `review_state`       | cross-review bookkeeping                           |

Every tool returns the same envelope. Results stay small: anything over 16 KiB is written to a content-addressed artifact and referenced by path and SHA-256.

---

## Development

```bash
yarn filid test:run     # Single run (CI)
yarn filid typecheck    # Type checking only
yarn filid build        # rules + pages + mcp + hooks + plugin adapters
yarn filid build:plugin # pages + mcp + hooks only — fast hook/MCP loop
yarn filid test:e2e     # settings page Playwright e2e
```

### Tech Stack

TypeScript 5.7, @modelcontextprotocol/sdk, Zod, esbuild, Vitest, Playwright

---

## Documentation

For technical details, see the [`.metadata/`](../../.metadata/filid/) directory:

| Document                                                       | Content                                              |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| [ARCHITECTURE](../../.metadata/filid/01-ARCHITECTURE.md)       | Design philosophy, layering, ADRs                    |
| [BLUEPRINT](../../.metadata/filid/02-BLUEPRINT.md)             | Module-by-module technical blueprint                 |
| [LIFECYCLE](../../.metadata/filid/03-LIFECYCLE.md)             | Skill workflows and hook timeline                    |
| [USAGE](../../.metadata/filid/04-USAGE.md)                     | Config structure, MCP/Hook examples, troubleshooting |
| [COST-ANALYSIS](../../.metadata/filid/05-COST-ANALYSIS.md)     | Hook overhead, bundle size, context token costs      |
| [HOW-IT-WORKS](../../.metadata/filid/06-HOW-IT-WORKS.md)       | Adapters, snapshot, DAG, MCP routing                 |
| [RULES-REFERENCE](../../.metadata/filid/07-RULES-REFERENCE.md) | Full rule catalog with constants and thresholds      |
| [API-SURFACE](../../.metadata/filid/08-API-SURFACE.md)         | MCP tool contracts and core DTOs                     |

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.

---

## License

MIT
