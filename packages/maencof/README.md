# @ogham/maencof

A Claude Code plugin that manages your personal knowledge space with a markdown-based Knowledge Graph.

AI agents forget you between sessions. Your notes scatter across tools, your insights fade, and every conversation starts from zero. maencof solves this with a **5-Layer Knowledge Model**, **Spreading Activation search**, and **memory lifecycle management** — all built on plain markdown files you own.

---

## Installation

### Via Marketplace (Recommended)

```bash
# 1. Add the repository to your marketplace
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install the plugin
claude plugin install maencof
```

All components (Skills, MCP, Agents, Hooks) register automatically. No manual configuration needed.

### For Development (Local Setup)

```bash
# From monorepo root
yarn install

# Build the plugin
cd packages/maencof
yarn build          # TypeScript compile + bundling

# Load in Claude Code
claude --plugin-dir ./packages/maencof
```

Building produces two outputs:

- `bridge/mcp-server.cjs` — MCP server (18 knowledge tools)
- `bridge/*.mjs` — 10 hook scripts (session-start, session-end, layer-guard, index-invalidator, dailynote-recorder, lifecycle-dispatcher, vault-committer, vault-redirector, insight-injector, changelog-gate)

> **Performance note**: maencof chains 4 hooks on `UserPromptSubmit` (context-injector → lifecycle-dispatcher → vault-committer → insight-injector), all fast-path optimized. Typical per-prompt overhead is ~60ms (~110ms on the first prompt of a session due to context cache build). The hook timeouts in `hooks.json` (2–3s) are kill-switches, not expected latency. The only path that runs git is `vault-committer`, and it requires three conditions to fire: vault opt-in (`vault-commit.json::enabled=true`) + a prompt matching `/clear` (or a configured `skip_patterns` entry) + dirty vault — i.e., only when the user explicitly signals "wrap up this session", at which point a ~1–2s commit is the intended cost.

---

## How to Use

maencof skills are **LLM prompts**, not CLI commands. You invoke them in Claude Code as natural language conversations. Flags like `--fix` are hints the LLM understands, but plain language works just as well.

### Initial Setup

```
/maencof:maencof-setup
/maencof:maencof-setup --step 4
```

7-step onboarding wizard: Vault path selection → Core Identity interview → AI companion generation → Layer directory creation → initial index build → rule activation → completion summary.

### Record Knowledge

```
/maencof:maencof-remember
/maencof:maencof-remember React Server Components 핵심 개념 정리
```

Creates a new document with automatic layer recommendation, tag extraction, frontmatter generation, and duplicate detection.

### Search Knowledge

```
/maencof:maencof-recall React 상태관리 관련 자료 찾아줘
/maencof:maencof-explore
```

- **`maencof-recall`** — Spreading Activation search across your Knowledge Graph. Activates related nodes through weighted links.
- **`maencof-explore`** — Interactive graph traversal (up to 3 rounds). Browse connections visually.

### Organize Knowledge

```
/maencof:maencof-organize
/maencof:maencof-organize --dry-run
/maencof:maencof-reflect
```

- **`maencof-organize`** — The memory-organizer agent recommends document moves → you confirm → it executes.
- **`maencof-reflect`** — Analysis only, no changes. Uses the judge module to assess knowledge health.

### Health Check

```
/maencof:maencof-diagnose
/maencof:maencof-checkup
/maencof:maencof-checkup --fix
```

- **`maencof-diagnose`** — Lightweight status check (index freshness, basic stats).
- **`maencof-checkup`** — 6 diagnostics + auto-fix: orphan documents, stale entries, broken links, layer violations, duplicates, frontmatter issues.

### Index Management

```
/maencof:maencof-build
/maencof:maencof-rebuild
```

- **`maencof-build`** — Auto-selects full or incremental mode based on index state.
- **`maencof-rebuild`** — Forces a complete re-index from scratch.

### External Data Ingestion

```
/maencof:maencof-ingest https://example.com/article
/maencof:maencof-connect github
/maencof:maencof-mcp-setup
```

- **`maencof-ingest`** — Converts URLs, GitHub issues, or raw text into knowledge documents.
- **`maencof-connect`** — Registers external data sources (GitHub, Jira, Slack, Notion).
- **`maencof-mcp-setup`** — Installs external MCP servers for expanded connectivity.

### Plugin Management

```
/maencof:maencof-manage
```

View skill/agent activation status, usage reports, and toggle features on/off.

### Environment Configuration

```
/maencof:maencof-configure
/maencof:maencof-bridge slack
/maencof:maencof-craft-skill pr-review
```

- `maencof-configure` — Unified entry point for project configuration (MCP, skills, agents, rules, CLAUDE.md).
- `maencof-bridge` — End-to-end external service integration: install MCP + register data source + generate workflow skill.
- `maencof-craft-skill` / `maencof-craft-agent` — Generate custom skills or agents via conversation.
- `maencof-instruct` — Safely edit CLAUDE.md with backup and @import splitting.
- `maencof-rule` — Create, edit, or remove behavioral rules.
- `maencof-lifecycle` — Register dynamic hook actions (echo/remind) triggered by lifecycle events.

---

## 5-Layer Knowledge Model

maencof organizes knowledge into five layers with distinct decay rates for Spreading Activation (SA):

| Layer | Name               | Directory      | SA Decay | Purpose                                 |
| ----- | ------------------ | -------------- | -------- | --------------------------------------- |
| L1    | Core Identity Hub  | `01_Core/`     | 0.5      | Who you are — protected, rarely changes |
| L2    | Derived Knowledge  | `02_Derived/`  | 0.7      | Internalized insights and skills        |
| L3    | External Reference | `03_External/` | 0.8      | Bookmarks, citations, external sources  |
| L4    | Action Memory      | `04_Action/`   | 0.9      | Volatile task notes, session context    |
| L5    | Context            | `05_Context/`  | 0.95     | Environmental metadata, domain context  |

**Lower decay = stronger persistence.** L1 documents activate strongly and stay relevant across searches. L4 documents fade quickly unless reinforced.

**Link direction rules:** Links flow downward (L1→L2→L3→L4) by default. Upward links (e.g., L3→L1) require explicit justification and are flagged during `maencof-organize`.

---

## What Runs Automatically

With the plugin active, these hooks fire **without user intervention**:

| When                   | What                          | Why                                                                |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------ |
| Session starts         | Loads Vault context + index   | Agent knows your knowledge from the first turn                     |
| Writing/editing a file | Layer guard check             | Prevents unauthorized L1 modifications                             |
| After maencof tool use | Index invalidation            | Keeps the Knowledge Graph in sync                                  |
| Session ends           | Session cleanup + persistence | Saves volatile state, prunes expired entries                       |
| On every user prompt   | Lifecycle dispatcher          | Executes user-registered actions (echo/remind) from lifecycle.json |
| On agent stop          | Lifecycle dispatcher          | Executes registered stop-event actions                             |

When a block occurs, a message explaining the reason is displayed. No action needed.

---

## Skills Reference

| Skill                  | Category | What it does                                   |
| ---------------------- | -------- | ---------------------------------------------- |
| `/maencof:maencof-setup`       | Setup    | 7-step onboarding wizard                       |
| `/maencof:maencof-remember`    | Core     | Record new knowledge (auto-layer, tags, dedup) |
| `/maencof:maencof-recall`      | Core     | Spreading Activation search                    |
| `/maencof:maencof-explore`     | Core     | Interactive graph traversal (up to 3 rounds)   |
| `/maencof:maencof-organize`    | Core     | Agent-guided document reorganization           |
| `/maencof:maencof-reflect`     | Core     | Read-only knowledge health analysis            |
| `/maencof:maencof-suggest`     | Core     | SA + Jaccard similarity link suggestions       |
| `/maencof:maencof-build`       | Index    | Build index (auto full/incremental)            |
| `/maencof:maencof-rebuild`     | Index    | Force full re-index                            |
| `/maencof:maencof-diagnose`    | Health   | Lightweight status check                       |
| `/maencof:maencof-checkup`     | Health   | 6 diagnostics + auto-fix                       |
| `/maencof:maencof-cleanup`     | Health   | Vault document deletion and CLAUDE.md cleanup  |
| `/maencof:maencof-ingest`      | Advanced | Import from URL, GitHub, or text               |
| `/maencof:maencof-connect`     | Advanced | Register external data sources                 |
| `/maencof:maencof-mcp-setup`   | Advanced | Install external MCP servers                   |
| `/maencof:maencof-manage`      | Advanced | Skill/agent activation and usage reports       |
| `/maencof:maencof-dailynote`   | Advanced | View daily activity log                        |
| `/maencof:maencof-insight`     | Advanced | Auto-insight capture management                |
| `/maencof:maencof-changelog`   | Advanced | Self-change daily changelog recorder           |
| `/maencof:maencof-migrate`     | Advanced | Vault architecture migration                   |
| `/maencof:maencof-configure`   | Config   | Unified environment configuration entry point  |
| `/maencof:maencof-bridge`      | Config   | MCP install + register + workflow skill in one |
| `/maencof:maencof-craft-skill` | Config   | Custom skill generator                         |
| `/maencof:maencof-craft-agent` | Config   | Custom agent generator                         |
| `/maencof:maencof-instruct`    | Config   | CLAUDE.md management                           |
| `/maencof:maencof-rule`        | Config   | Behavioral rule management                     |
| `/maencof:maencof-lifecycle`   | Config   | Lifecycle action management                    |
| `/maencof:maencof-think`       | Analysis | Tree of Thoughts requirement analysis          |
| `/maencof:maencof-refine`      | Analysis | Ambiguous input refinement interview loop      |

---

## Vault Auto-Commit Policy

The `vault-committer` hook can automatically commit changes under `.maencof/` and `.maencof-meta/` when a session ends or when the user types `/clear`. The feature is **opt-in only** — it activates only when `.maencof-meta/vault-commit.json` contains `{"enabled": true}`.

When enabled, the committer invokes `git commit --no-verify`, bypassing your repository's pre-commit hooks for these automatic commits. This is an explicit, documented exception to the general "never skip hooks" principle:

- **Why** — If a user pre-commit hook writes to or reads from the vault directories, running it as part of a vault auto-commit creates a recursion loop (hook modifies vault → vault-committer runs → pre-commit runs again → …). `--no-verify` breaks that loop.
- **Who is affected** — Only vault auto-commits produced by this hook. Your own `git commit` invocations, CI commits, and any other committer continue to run pre-commit hooks normally.
- **How to opt out** — Set `"enabled": false` (or delete the file) in `.maencof-meta/vault-commit.json`. No vault auto-commits will be produced. Your pre-commit hooks remain untouched regardless.
- **Customizing prompt triggers** — Add a `skip_patterns` array (regex sources) to the same config file. The default is `/clear` only; extending the list lets you wire additional trigger prompts without touching source.

See `src/hooks/vault-committer/DETAIL.md` for the full contract and the v0.4.0 roadmap item that will revisit this policy once a loop-detector implementation is available.

---

## Key Rules

Core rules enforced by maencof:

| Rule              | Threshold                                        | Enforcement        |
| ----------------- | ------------------------------------------------ | ------------------ |
| L1 protection     | Core Identity documents are read-only by default | Hook (auto-block)  |
| Frontmatter       | YAML frontmatter required on all documents       | MCP validation     |
| Naming convention | `kebab-case.md`, layer prefix matching directory | MCP validation     |
| Layer structure   | 5-layer directory hierarchy must be maintained   | MCP + agent        |
| Link integrity    | No broken links, no orphan documents             | Checkup diagnostic |

---

## Development

```bash
yarn dev            # TypeScript watch mode
yarn test           # Vitest watch
yarn test:run       # Single run
yarn typecheck      # Type checking only
yarn build          # tsc + esbuild (MCP + hooks)
```

### Tech Stack

TypeScript 5.7, @modelcontextprotocol/sdk, fast-glob, esbuild, Vitest, Zod

---

## Documentation

For technical details, see the [`.metadata/maencof/`](../../.metadata/maencof/) directory at the monorepo root:

| Document Set                                                                                                                       | Content                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Claude-Code-Plugin-Design](../../.metadata/maencof/Claude-Code-Plugin-Design/) (26 docs)                                          | Plugin architecture, knowledge layers, search engine, modules, lifecycle, onboarding |
| [Tree-Graph-Hybrid-Knowledge-Architecture](../../.metadata/maencof/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/) (6 docs) | Research background, dual structure design, theoretical foundation, layered model    |
| [TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm](../../.metadata/maencof/TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm/)    | Knowledge graph indexing, cycle detection, Spreading Activation model                |
| [TOOL/Markdown-Knowledge-Graph-Search-Engine](../../.metadata/maencof/TOOL/Markdown-Knowledge-Graph-Search-Engine/)                | System components, data flow, metadata strategy, search implementation               |

[한국어 문서 (README-ko_kr.md)](./README-ko_kr.md)도 제공됩니다.

---

## License

MIT
