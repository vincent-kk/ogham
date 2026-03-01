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

- `bridge/mcp-server.cjs` — MCP server (10 knowledge tools)
- `bridge/*.mjs` — 4 hook scripts (automatic knowledge protection)

---

## How to Use

maencof skills are **LLM prompts**, not CLI commands. You invoke them in Claude Code as natural language conversations. Flags like `--fix` are hints the LLM understands, but plain language works just as well.

### Initial Setup

```
/maencof:setup
/maencof:setup --step 3
```

6-step onboarding wizard: Vault path selection → Core Identity interview → Layer directory creation → initial index build → rule activation → completion summary.

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
/maencof:diagnose
/maencof:doctor
/maencof:doctor --fix
```

- **`diagnose`** — Lightweight status check (index freshness, basic stats).
- **`doctor`** — 6 diagnostics + auto-fix: orphan documents, stale entries, broken links, layer violations, duplicates, frontmatter issues.

### Index Management

```
/maencof:build
/maencof:rebuild
```

- **`build`** — Auto-selects full or incremental mode based on index state.
- **`rebuild`** — Forces a complete re-index from scratch.

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

| When                   | What                          | Why                                            |
| ---------------------- | ----------------------------- | ---------------------------------------------- |
| Session starts         | Loads Vault context + index   | Agent knows your knowledge from the first turn |
| Writing/editing a file | Layer guard check             | Prevents unauthorized L1 modifications         |
| After maencof tool use | Index invalidation            | Keeps the Knowledge Graph in sync              |
| Session ends           | Session cleanup + persistence | Saves volatile state, prunes expired entries   |

When a block occurs, a message explaining the reason is displayed. No action needed.

---

## Skills Reference

| Skill                | Category | What it does                                   |
| -------------------- | -------- | ---------------------------------------------- |
| `/maencof:setup`     | Setup    | 6-step onboarding wizard                       |
| `/maencof:remember`  | Core     | Record new knowledge (auto-layer, tags, dedup) |
| `/maencof:recall`    | Core     | Spreading Activation search                    |
| `/maencof:explore`   | Core     | Interactive graph traversal (up to 3 rounds)   |
| `/maencof:organize`  | Core     | Agent-guided document reorganization           |
| `/maencof:reflect`   | Core     | Read-only knowledge health analysis            |
| `/maencof:build`     | Index    | Build index (auto full/incremental)            |
| `/maencof:rebuild`   | Index    | Force full re-index                            |
| `/maencof:diagnose`  | Health   | Lightweight status check                       |
| `/maencof:doctor`    | Health   | 6 diagnostics + auto-fix                       |
| `/maencof:ingest`    | Advanced | Import from URL, GitHub, or text               |
| `/maencof:connect`   | Advanced | Register external data sources                 |
| `/maencof:mcp-setup` | Advanced | Install external MCP servers                   |
| `/maencof:manage`    | Advanced | Skill/agent activation and usage reports       |

---

## Key Rules

Core rules enforced by maencof:

| Rule              | Threshold                                        | Enforcement       |
| ----------------- | ------------------------------------------------ | ----------------- |
| L1 protection     | Core Identity documents are read-only by default | Hook (auto-block) |
| Frontmatter       | YAML frontmatter required on all documents       | MCP validation    |
| Naming convention | `kebab-case.md`, layer prefix matching directory | MCP validation    |
| Layer structure   | 5-layer directory hierarchy must be maintained   | MCP + agent       |
| Link integrity    | No broken links, no orphan documents             | Doctor diagnostic |

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

For technical details, see the [`.metadata/`](./.metadata/) directory:

| Document Set                                                                                                                 | Content                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Claude-Code-Plugin-Design](./.metadata/Claude-Code-Plugin-Design/) (26 docs)                                                | Plugin architecture, knowledge layers, search engine, modules, lifecycle, onboarding |
| [Tree-Graph-Hybrid-Knowledge-Architecture](./.metadata/Tree-Graph-Hybrid-Knowledge-Architecture-Research-Proposal/) (6 docs) | Research background, dual structure design, theoretical foundation, layered model    |
| [TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm](./.metadata/TOOL/Markdown-Graph-Knowledge-Discovery-Algorithm/)          | Knowledge graph indexing, cycle detection, Spreading Activation model                |
| [TOOL/Markdown-Knowledge-Graph-Search-Engine](./.metadata/TOOL/Markdown-Knowledge-Graph-Search-Engine/)                      | System components, data flow, metadata strategy, search implementation               |

[한국어 문서 (README-ko_kr.md)](./README-ko_kr.md)도 제공됩니다.

---

## License

MIT
