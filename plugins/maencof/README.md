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
cd plugins/maencof
yarn build          # TypeScript compile + bundling

# Load in Claude Code
claude --plugin-dir ./plugins/maencof
```

Building produces two outputs:

- `bridge/mcp-server.cjs` — MCP server (19 knowledge tools)
- `bridge/*.mjs` — 10 hook scripts (session-start, session-end, layer-guard, context-injector, activity-recorder, lifecycle-dispatcher, vault-committer, vault-redirector, insight-injector, changelog-gate)

> **Performance note**: maencof chains 4 hooks on `UserPromptSubmit` (context-injector → lifecycle-dispatcher → vault-committer → insight-injector), all fast-path optimized. Typical per-prompt overhead is ~60ms (~110ms on the first prompt of a session due to context cache build). The hook timeouts in `hooks.json` (2–3s) are kill-switches, not expected latency. The only path that runs git is `vault-committer`, and it requires three conditions to fire: vault opt-in (`vault-commit.json::enabled=true`) + a prompt matching `/clear` (or a configured `skip_patterns` entry) + dirty vault — i.e., only when the user explicitly signals "wrap up this session", at which point a ~1–2s commit is the intended cost.

---

## How to Use

maencof skills are **LLM prompts**, not CLI commands. You invoke them in Claude Code as natural language conversations. Flags like `--fix` are hints the LLM understands, but plain language works just as well.

### Initial Setup

```
/maencof:setup
/maencof:setup --step 4
```

7-step onboarding wizard: Vault path selection → Core Identity interview → AI companion generation → Layer directory creation → initial index build → rule activation → completion summary.

### Record Knowledge

```
/maencof:remember
/maencof:remember React Server Components 핵심 개념 정리
```

Creates a new document with automatic layer recommendation, tag extraction, frontmatter generation, and duplicate detection.

### Search Knowledge

```
/maencof:recall React 상태관리 관련 자료 찾아줘
/maencof:explore
```

- **`recall`** — Spreading Activation search across your Knowledge Graph. Activates related nodes through weighted links.
- **`explore`** — Interactive graph traversal (up to 3 rounds). Browse connections visually.

### Organize Knowledge

```
/maencof:organize
/maencof:organize --dry-run
/maencof:reflect
```

- **`organize`** — The memory-organizer agent recommends document moves → you confirm → it executes.
- **`reflect`** — Analysis only, no changes. Uses the judge module to assess knowledge health.

### Health Check

```
/maencof:checkup --quick
/maencof:checkup
/maencof:checkup --fix
```

- **`checkup --quick`** — Lightweight read-only status check (index freshness, stale ratio, sub-layer distribution). Absorbs the former `maencof-diagnose` skill.
- **`checkup`** — 7 diagnostics + auto-fix: orphan documents, stale entries, broken links, layer violations, duplicates, frontmatter issues, auto-insight system health.

### Index Management

```
/maencof:build
/maencof:build --force --reset-cache
```

- **`build`** — Auto-selects full or incremental mode based on index state. Pass `--force` for an unconditional full rebuild, or `--force --reset-cache` to discard the `.maencof/` cache entirely before rebuilding (recovery / migration mode; absorbs the former `maencof-rebuild` skill).

### External Data Ingestion

```
/maencof:ingest https://example.com/article
/maencof:connect github
/maencof:mcp-setup
```

- **`ingest`** — Converts URLs, GitHub issues, or raw text into knowledge documents.
- **`connect`** — Registers external data sources (GitHub, Jira, Slack, Notion).
- **`mcp-setup`** — Installs external MCP servers for expanded connectivity.

### Plugin Management

```
/maencof:manage
```

View skill/agent activation status, usage reports, and toggle features on/off.

### Environment Configuration

```
/maencof:configure
/maencof:bridge slack
/maencof:craft-skill pr-review
```

- `configure` — Unified entry point for project configuration (MCP, skills, agents, rules, CLAUDE.md).
- `bridge` — End-to-end external service integration: install MCP + register data source + generate workflow skill.
- `craft-skill` / `craft-agent` — Generate custom skills or agents via conversation.
- `instruct` — Safely edit CLAUDE.md with backup and @import splitting.
- `rule` — Create, edit, or remove behavioral rules.
- `lifecycle` — Register dynamic hook actions (echo/remind) triggered by lifecycle events.

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

**Link direction rules:** Links flow downward (L1→L2→L3→L4) by default. Upward links (e.g., L3→L1) require explicit justification and are flagged during `organize`.

---

## What Runs Automatically

With the plugin active, these hooks fire **without user intervention**:

| When                   | What                              | Why                                                                                  |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------------------------ |
| Session starts         | Loads Vault context + index       | Agent knows your knowledge from the first turn                                       |
| Writing/editing a file | Layer guard check                 | Prevents unauthorized L1 modifications                                               |
| After maencof write    | Activity log recording            | Tracks vault writes (create/update/move/delete) for change history                   |
| Session ends           | Session cleanup + persistence     | Saves volatile state, prunes expired entries                                         |
| On every user prompt   | Context-injection chain (4 hooks) | Loads turn context, fires registered actions, captures insights, gates vault commits |
| On agent stop          | Lifecycle dispatcher              | Executes registered stop-event actions                                               |

When a block occurs, a message explaining the reason is displayed. No action needed.

---

## Skills Reference

| Skill                      | Category | What it does                                                                                         |
| -------------------------- | -------- | ---------------------------------------------------------------------------------------------------- |
| `/maencof:setup`           | Setup    | 7-step onboarding wizard                                                                             |
| `/maencof:remember`        | Core     | Record new knowledge (auto-layer, tags, dedup)                                                       |
| `/maencof:recall`          | Core     | Spreading Activation search                                                                          |
| `/maencof:explore`         | Core     | Interactive graph traversal (up to 3 rounds)                                                         |
| `/maencof:organize`        | Core     | Agent-guided document reorganization                                                                 |
| `/maencof:reflect`         | Core     | Read-only knowledge health analysis                                                                  |
| `/maencof:suggest`         | Core     | SA + Jaccard similarity link suggestions                                                             |
| `/maencof:build`           | Index    | Build index (auto full/incremental; `--force` for rebuild, `--force --reset-cache` to discard cache) |
| `/maencof:checkup`         | Health   | 7 diagnostics + auto-fix; `--quick` for lightweight status check (absorbs former `maencof-diagnose`) |
| `/maencof:cleanup`         | Health   | Vault document deletion and CLAUDE.md cleanup                                                        |
| `/maencof:ingest`          | Advanced | Import from URL, GitHub, or text                                                                     |
| `/maencof:connect`         | Advanced | Register external data sources                                                                       |
| `/maencof:mcp-setup`       | Advanced | Install external MCP servers                                                                         |
| `/maencof:manage`          | Advanced | Skill/agent activation and usage reports                                                             |
| `/maencof:insight`         | Advanced | Auto-insight capture management                                                                      |
| `/maencof:changelog`       | Advanced | Self-change daily changelog recorder                                                                 |
| `/maencof:migrate`         | Advanced | Vault architecture migration                                                                         |
| `/maencof:configure`       | Config   | Unified environment configuration entry point                                                        |
| `/maencof:bridge`          | Config   | MCP install + register + workflow skill in one                                                       |
| `/maencof:craft-skill`     | Config   | Custom skill generator                                                                               |
| `/maencof:craft-agent`     | Config   | Custom agent generator                                                                               |
| `/maencof:craft-dashboard` | Config   | Generate or update a personal vault dashboard from an interview                                      |
| `/maencof:instruct`        | Config   | CLAUDE.md management                                                                                 |
| `/maencof:rule`            | Config   | Behavioral rule management                                                                           |
| `/maencof:lifecycle`       | Config   | Lifecycle action management                                                                          |
| `/maencof:think`           | Analysis | Tree of Thoughts requirement analysis                                                                |
| `/maencof:refine`          | Analysis | Ambiguous input refinement interview loop                                                            |

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

| Document Set                                                                                                                             | Content                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Claude-Code-Plugin-Design](../../.metadata/maencof/Claude-Code-Plugin-Design/) (26 docs)                                                | Plugin architecture, knowledge layers, search engine, modules, lifecycle, onboarding |
| [Tree-Graph-Hybrid-Knowledge-Architecture](../../.metadata/maencof/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/) (6 docs) | Research background, dual structure design, theoretical foundation, layered model    |
| [TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm](../../.metadata/maencof/TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm/)          | Knowledge graph indexing, cycle detection, Spreading Activation model                |
| [TOOL/Markdown-Knowledge-Graph-Search-Engine](../../.metadata/maencof/TOOL/Markdown-Knowledge-Graph-Search-Engine/)                      | System components, data flow, metadata strategy, search implementation               |

[한국어 문서 (README-ko_kr.md)](./README-ko_kr.md)도 제공됩니다.

---

## License

MIT
