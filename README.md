# Ogham

[![TypeScript](https://img.shields.io/badge/typescript-✔-blue.svg)]()
[![Claude Code](https://img.shields.io/badge/claude--code-plugin-purple.svg)]()
[![Node.js](https://img.shields.io/badge/node.js-20+-green.svg)]()

---

## Overview

**Ogham** is a monorepo for Claude Code plugins and AI-powered developer tools. Everything is built with TypeScript. The repo hosts eight plugins that extend Claude Code agent behavior — from automated project structure management and personal knowledge graphs to Atlassian integration, multi-model delegation, planning pipelines, browser-based document preview, and academic peer review — plus a standalone yt-dlp MCP server that pulls YouTube transcripts and media into any MCP app.

---

## Quick Start — Marketplace Installation

The easiest way to use Ogham plugins is through the Claude Code plugin marketplace.

```bash
# 1. Register this repository as a marketplace source
claude plugin marketplace add https://github.com/vincent-kk/ogham

# 2. Install a plugin (any of the eight listed below)
claude plugin install filid
claude plugin install maencof
```

That's it. All components (Skills, MCP tools, Agents, Hooks) register automatically — no manual configuration needed.

> After installation, you can start using plugin skills directly in Claude Code. For example, type `/filid:setup` to initialize FCA-AI in your project. See the [All Packages](#all-packages) table below for every available plugin.

---

## Plugins

### [`@ogham/filid`](./plugins/filid/) — FCA-AI Rule Enforcement

A Claude Code plugin that automatically manages project structure and documentation through **Fractal Context Architecture (FCA-AI)**.

As codebases grow, AI agents lose context, documentation drifts from code, and directory structures lose consistency. filid solves this with automated rule enforcement.

**What it provides:**

| Component | Count    | Examples                                                                |
| --------- | -------- | ----------------------------------------------------------------------- |
| Skills    | 19       | `/filid:setup`, `/filid:cross-review`, `/filid:scan`, `/filid:pipeline` |
| MCP Tools | 18       | Structure analysis, drift detection, AST metrics, debt tracking         |
| Agents    | 14       | Architect, Implementer, QA Reviewer, 7-persona review committee         |
| Hooks     | 5 events | SessionStart, PreToolUse, SubagentStart, UserPromptSubmit, SessionEnd   |

**Key features:**

- **Multi-persona consensus review** — A 7-persona committee (architect, knowledge manager, SRE, business driver, product manager, design/HCI, adjudicator) reaches consensus on PR changes
- **Automated rule enforcement** — INTENT.md 50-line limit, 3-tier boundary section validation, organ directory protection, naming conventions
- **Structural drift detection** — Detects when code changes break documented structure and syncs automatically via DAG analysis
- **AST-powered analysis** — Module cohesion (LCOM4), cyclomatic complexity, circular-dependency detection via `@ast-grep/napi`
- **End-to-end pipeline** — `pipeline` chains PR creation → multi-persona review → resolve → revalidate

```
# Initialize FCA-AI in your project
/filid:setup

# Scan for rule violations
/filid:scan

# Run multi-persona code review on current branch
/filid:cross-review

# Run the full PR pipeline (review → resolve → revalidate)
/filid:pipeline
```

For full documentation, see the [filid README](./plugins/filid/README.md) ([Korean](./plugins/filid/README-ko_kr.md)).

### [`@ogham/maencof`](./plugins/maencof/) — Personal Knowledge Space Manager

A Claude Code plugin that manages your personal knowledge as a **markdown-based Knowledge Graph** with **Spreading Activation** search.

AI agents forget you between sessions. Notes scatter across tools, insights vanish, and every conversation starts from zero. maencof solves this with a 5-layer knowledge model built on plain markdown files you own.

**What it provides:**

| Component | Count       | Examples                                                                        |
| --------- | ----------- | ------------------------------------------------------------------------------- |
| Skills    | 26          | `/maencof:setup`, `/maencof:remember`, `/maencof:recall`, `/maencof:organize`   |
| MCP Tools | 18          | Knowledge CRUD, graph search, spreading activation, insight capture             |
| Agents    | 5           | Memory Organizer, Identity Guardian, Checkup, Configurator, Knowledge Connector |
| Hooks     | multi-event | SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, SessionEnd       |

**Key features:**

- **5-Layer Knowledge Model v2** — `01_Core` (identity, read-only) → `02_Derived` (internalized) → `03_External` (relational / structural / topical sublayers) → `04_Action` (volatile task memory) → `05_Context` (buffer / boundary)
- **Spreading Activation Search** — Graph-based associative search that finds related knowledge by energy propagation across layer-specific decay rates (0.5–0.95)
- **Memory Lifecycle Management** — Automated knowledge promotion, archival, and cleanup across the 5 layers
- **Dialogue Meta-Prompt Injection** — SessionStart hook injects a per-session dialogue discipline meta-prompt; AI companion persona generated from your core identity

```
# Initialize your knowledge vault
/maencof:setup

# Remember something new
/maencof:remember

# Search your knowledge graph
/maencof:recall
```

For full documentation, see the [maencof README](./plugins/maencof/README.md) ([Korean](./plugins/maencof/README-ko_kr.md)).

### [`@ogham/atlassian`](./plugins/atlassian/) — Jira & Confluence Integration

A native TypeScript replacement for the Python `mcp-atlassian` MCP server, providing first-class Jira and Confluence access from Claude Code.

Teams using Jira and Confluence pay a context tax: dozens of tool schemas bloat every prompt, and generic MCP tools don't understand domain workflows. atlassian solves this with domain-expert agents that encapsulate the workflow knowledge and load tool schemas lazily.

**What it provides:**

| Component | Count | Examples                                                                                                           |
| --------- | ----- | ------------------------------------------------------------------------------------------------------------------ |
| Skills    | 5     | `/atlassian:setup`, `/atlassian:jira`, `/atlassian:confluence`, `/atlassian:download`, `/atlassian:media-analysis` |
| MCP Tools | 4     | `fetch`, `convert`, `auth-check`, `setup`                                                                          |
| Agents    | 3     | jira, confluence, media (multimodal keyframe analysis)                                                             |
| Hooks     | 0     | —                                                                                                                  |

**Key features:**

- **Domain-expert agents** — Three specialized agents (jira / confluence / media) encapsulate API knowledge across 15 Jira tool domains + 8 Confluence tool domains, replacing 50+ individual MCP tool schemas
- **Lazy reference loading** — API capsules load tool schemas only when needed, keeping the context window small
- **Multi-format conversion** — Built-in ADF / Storage / Wiki ↔ Markdown converter ported from the Python `mcp-atlassian` source
- **Multimodal media analysis** — Media agent extracts keyframes from images / videos / GIFs and runs semantic scene analysis
- **Auth coverage** — Basic (email + token), PAT (Server / DC), OAuth 2.0 (3LO) for both Cloud and Server / DC instances

```
# Configure Jira / Confluence credentials
/atlassian:setup

# Operate on Jira issues
/atlassian:jira

# Operate on Confluence pages
/atlassian:confluence
```

For full documentation, see the [atlassian README](./plugins/atlassian/README.md) ([Korean](./plugins/atlassian/README-ko_kr.md)).

### [`@ogham/cennad`](./plugins/cennad/) — Codex / Antigravity / Claude CLI Delegation

A Claude Code plugin that lets Claude delegate work to **OpenAI Codex CLI**, **Google Antigravity CLI**, or **Anthropic Claude CLI** through MCP tools, skills, and lifecycle hooks.

Different models have different strengths: Codex excels at heavy code generation in a sandboxed shell; Antigravity excels at live web-grounded research and very-large-context synthesis; Claude offers fully isolated reasoning, writing, and review. cennad makes that delegation explicit, ratio-aware, and reproducible across sessions.

> **Renamed from `cogair`.** If you used the old `cogair` plugin, its `/cogair:*` skills and `~/.claude/plugins/cogair/` settings no longer apply — reinstall as `cennad` and run `/cennad:setup` to reconfigure.

**What it provides:**

| Component | Count | Examples                                                                                        |
| --------- | ----- | ----------------------------------------------------------------------------------------------- |
| Skills    | 5     | `/cennad:setup`, `/cennad:codex`, `/cennad:antigravity`, `/cennad:claude`, `/cennad:crosscheck` |
| MCP Tools | 3     | `start_conversation`, `continue_conversation`, `open_settings`                                  |
| Agents    | 0     | (skills delegate directly to external CLIs)                                                     |
| Hooks     | 2     | SessionStart, UserPromptSubmit                                                                  |

**Key features:**

- **Multi-model delegation** — Route code-heavy tasks to Codex (sandboxed shell, refactor), research-heavy tasks to Antigravity (live web search, large context), or isolated reasoning to Claude, via keyword-driven routing
- **Cross-validation** — `/cennad:crosscheck` dispatches the same prompt to every enabled provider in parallel and synthesizes their answers
- **Local settings UI** — Web UI bound to 127.0.0.1 with one-time-token auth for editing provider ratio, intervention strength (-2 to +2), keyword routing, and default model alias
- **Session bookkeeping** — Project-hash-scoped sessions with resume capability; SessionStart / UserPromptSubmit hooks inject ratio + drift + counter state into context

```
# Open the local settings UI
/cennad:setup

# Delegate to Codex CLI
/cennad:codex

# Delegate to Antigravity CLI
/cennad:antigravity

# Delegate to an isolated Claude CLI
/cennad:claude

# Cross-validate a prompt across enabled providers
/cennad:crosscheck
```

For full documentation, see the [cennad README](./plugins/cennad/README.md) ([Korean](./plugins/cennad/README-ko_kr.md)).

### [`@ogham/imbas`](./plugins/imbas/) — Planning → Issue Pipeline

A Claude Code plugin that converts planning documents into Jira or GitHub issues through a 4-phase orchestration pipeline.

Translating a strategy doc into well-formed, EARS-style developer tickets is repetitive and error-prone. imbas automates the entire flow — from validating the source plan to creating Stories, Tasks, and Subtasks — while keeping every step provider-agnostic.

**What it provides:**

| Component | Count | Examples                                                                                  |
| --------- | ----- | ----------------------------------------------------------------------------------------- |
| Skills    | 12    | `/imbas:pipeline`, `/imbas:validate`, `/imbas:split`, `/imbas:devplan`, `/imbas:manifest` |
| MCP Tools | 16    | `run_create`, `manifest_save`, `manifest_implement_plan`, etc.                            |
| Agents    | 3     | analyst (sonnet), planner (sonnet), engineer (opus, maxTurns: 80)                         |
| Hooks     | 3     | pre-tool-use, context-injector, session-cleanup                                           |

**Key features:**

- **4-phase pipeline** — validate → split → manifest-stories → devplan → manifest-devplan with checkpoint files between phases
- **Provider abstraction** — A single skill targets `jira`, `github`, or `local` providers; switching is a config change
- **Agent separation** — Three role-specialized agents (analyst for validation, planner for splitting, engineer for EARS Subtask generation)
- **Run-based state** — Each pipeline execution gets a `run_id` and `.imbas/runs/<id>/` directory for resumable, auditable runs

```
# Initialize imbas configuration
/imbas:setup

# Run the full pipeline on a planning doc
/imbas:pipeline

# Check pipeline status
/imbas:status
```

For full documentation, see the [imbas README](./plugins/imbas/README.md) ([Korean](./plugins/imbas/README-ko_kr.md)).

### [`@ogham/maencof-lens`](./plugins/maencof-lens/) — Read-Only Vault Access

A read-only wrapper around maencof's knowledge graph for cross-project vault access. Lets development sessions consult your personal vault without risking writes.

If you use maencof to keep design notes, architecture decisions, and personal research, you want those findings reachable from other projects — but only as references. maencof-lens routes multi-vault reads through a layer-filter guard so development contexts can borrow knowledge safely.

**What it provides:**

| Component | Count | Examples                                                             |
| --------- | ----- | -------------------------------------------------------------------- |
| Skills    | 3     | `/maencof-lens:setup`, `/maencof-lens:lookup`, `/maencof-lens:brief` |
| MCP Tools | 5     | `search`, `context`, `navigate`, `read`, `status`                    |
| Agents    | 1     | researcher (autonomous multi-tool vault exploration)                 |
| Hooks     | 1     | SessionStart (config detection + skill usage guide injection)        |

**Key features:**

- **Read-only by design** — Reuses maencof handlers but blocks all mutation paths; layer-filter guard (L1 excluded by default) is enforced on every tool call
- **Multi-vault routing** — Register multiple vaults in `.maencof-lens/config.json` and switch by name
- **Token-budgeted context assembly** — `/maencof-lens:brief` assembles relevant vault docs within a target token budget for prompt injection
- **Autonomous researcher** — The `researcher` agent performs deep multi-step vault exploration via spreading activation

```
# Register a vault (default vault on first run)
/maencof-lens:setup

# Quick lookup of a single topic
/maencof-lens:lookup

# Token-budgeted multi-doc context for the current task
/maencof-lens:brief
```

For full documentation, see the [maencof-lens package](./plugins/maencof-lens/).

### [`@ogham/deilen`](./plugins/deilen/) — Browser Preview with Line-Anchored Feedback

A Claude Code plugin that renders Claude-generated markdown documents as a readable browser page and routes line-anchored feedback back to Claude.

Long markdown reports — plans, specs, analyses — are painful to read as a wall of terminal text, and replying to a specific line is harder still. deilen serves the document as a clean local page (127.0.0.1) where you can select any line, comment, and send it straight back to the conversation.

**What it provides:**

| Component | Count | Examples                                                             |
| --------- | ----- | -------------------------------------------------------------------- |
| Skills    | 2     | `/deilen:preview`, `/deilen:setup`                                   |
| MCP Tools | 4     | `render_viewer`, `collect_feedback`, `close_viewer`, `open_settings` |
| Agents    | 0     | —                                                                    |
| Hooks     | 0     | —                                                                    |

**Key features:**

- **Readable rendering** — Tables, code highlighting, Mermaid diagrams, and math, with heavy renderers (Mermaid / highlight.js / KaTeX) lazy-loaded so unused ones never cost memory
- **Line-anchored feedback** — Select any line, attach a comment and images (including pasted clipboard screenshots), and submit; feedback returns to Claude as structured text plus image blocks it can actually see
- **Source copy** — Copy the original markdown as a whole document, a single section, or one code block
- **Bounded long-poll** — The local MCP server opens the page and waits for your feedback within a bounded timeout, then hands it back to the conversation
- **Local settings UI** — Configure theme, auto-open, timeouts, and renderer toggles from a 127.0.0.1 settings page

```
# Preview the current document and collect feedback
/deilen:preview

# Open the local settings UI
/deilen:setup
```

For full documentation, see the [deilen README](./plugins/deilen/README.md) ([Korean](./plugins/deilen/README-ko_kr.md)).

### [`@ogham/prawf`](./plugins/prawf/) — Multi-Agent Academic Peer Review

A pure-markdown Claude Code plugin that runs academic peer review as a nine-persona committee. _Prawf_ is Welsh for "test / proof".

Getting honest, rigorous feedback on a paper before submission is hard. prawf takes a manuscript apart the way a journal committee would — six soundness reviewers attack across distinct axes, an author's advocate defends, and a handling editor adjudicates — and hands back a defensible verdict plus the questions to expect at your defense. When the paper holds up, **PASS (Accept)** is a real outcome, justified on evidence.

**What it provides:**

| Component | Count | Examples                                                                              |
| --------- | ----- | ------------------------------------------------------------------------------------- |
| Skills    | 4     | `/prawf:peer-review`, `/prawf:simulate-defense`, `/prawf:rebuttal`, `/prawf:auto-fix` |
| MCP Tools | 0     | (pure markdown — no MCP server)                                                       |
| Agents    | 10    | argument-analyst, methodologist, statistical-auditor, chair, impact-assessor, …       |
| Hooks     | 0     | —                                                                                     |

**Key features:**

- **Nine-persona committee** — Six soundness reviewers (argument, method, statistics, causality, bias, integrity) attack the paper; an impact-assessor scores significance; a rebuttal-strategist defends; a chair adjudicates
- **Soundness-only verdict** — The verdict is a pure function of unresolved soundness findings at or above the `--gate` (default `major`); minor and significance findings are advisory, so a clean-but-unexciting paper still reaches accept
- **Field profiles** — Built-in `empirical-science`, `cs-ml`, `math-theory`, and `humanities-qualitative` profiles inject field-specific frameworks; the chair auto-detects which to use
- **Defense rehearsal** — `/prawf:simulate-defense` runs a mock Q&A so you can rehearse, and `/prawf:rebuttal` turns real reviewer comments into a rebuttal letter
- **Zero runtime dependencies** — No MCP server, no hooks, no build step; evaluation is persona reasoning on Claude Code's native team tools

```
# Run the full committee review on a paper
/prawf:peer-review

# Rehearse your defense with the committee
/prawf:simulate-defense paper.pdf

# Turn reviewer comments into a rebuttal letter
/prawf:rebuttal paper.pdf reviews.txt
```

For full documentation, see the [prawf README](./plugins/prawf/README.md) ([Korean](./plugins/prawf/README-ko_kr.md)).

---

## MCP Servers

Standalone MCP servers in this repo are not Claude Code plugins — they're npm packages you add to any MCP app's config (Claude Desktop, Cursor, Claude Code, …).

### [`@ogham/yt-dlp-mcp`](./mcp-servers/yt-dlp-mcp/) — YouTube Transcripts, Metadata & Media

An MCP server that pulls transcripts, metadata, comments, chapters, and media from YouTube — and any other site [yt-dlp](https://github.com/yt-dlp/yt-dlp) supports — into Claude Desktop, Cursor, and other MCP apps.

No Python, `pip`, `brew`, or yt-dlp install required: on the first request the server downloads its own checksum-verified yt-dlp binary into `~/.yt-dlp/` and reuses it. Works on Windows, macOS, and Linux.

**What it provides:**

| Aspect        | Detail                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| Tools         | 14 (5 on by default, 9 opt-in via `YTDLP_ENABLE_*`)                                                         |
| Default tools | search, subtitle languages, transcript, metadata, playlist                                                  |
| Opt-in tools  | raw subtitles, metadata / comments summary, comments, chapters, heatmap, thumbnail / video / audio download |
| Install       | `npx -y @ogham/yt-dlp-mcp` (zero system dependencies)                                                       |

**Key features:**

- **Read a video without watching it** — Pull a clean transcript, a metadata summary, chapters, or the "most replayed" heatmap; search YouTube or list a whole playlist / channel
- **Self-managing binary** — Downloads, checksum-verifies (`SHA2-256SUMS`), and refreshes its own yt-dlp release on a configurable cooldown; never fetches `releases/latest` blindly
- **Rate-limit resistant** — Impersonates the 429-resistant `ios` / `tv` player clients by default, with an optional rotating proxy pool and adaptive request pacing
- **Toggle tools per app** — Five read tools on by default; downloads and heavier extractors stay hidden until you set their `YTDLP_ENABLE_*` flag, keeping the tool list short
- **Safe by design** — Extraction runs in throwaway temp folders, tools accept only a fixed option set (no shell injection), and download / cookie / proxy features are off by default

For full documentation, see the [yt-dlp-mcp README](./mcp-servers/yt-dlp-mcp/README.md) ([Korean](./mcp-servers/yt-dlp-mcp/README-ko_kr.md)).

---

## All Packages

| Package                                       | Type          | Description                                                                 |
| --------------------------------------------- | ------------- | --------------------------------------------------------------------------- |
| **[`filid`](./plugins/filid/)**               | Claude plugin | FCA-AI rule enforcement and fractal context management                      |
| **[`maencof`](./plugins/maencof/)**           | Claude plugin | Personal knowledge space manager with Knowledge Graph                       |
| **[`atlassian`](./plugins/atlassian/)**       | Claude plugin | Jira / Confluence integration with domain-expert agents                     |
| **[`cennad`](./plugins/cennad/)**             | Claude plugin | Delegate to OpenAI Codex / Google Antigravity / Claude CLI from Claude Code |
| **[`imbas`](./plugins/imbas/)**               | Claude plugin | Planning-doc → Jira / GitHub issue pipeline                                 |
| **[`maencof-lens`](./plugins/maencof-lens/)** | Claude plugin | Read-only vault knowledge graph access for development contexts             |
| **[`deilen`](./plugins/deilen/)**             | Claude plugin | Render Claude markdown documents in a browser with line-anchored feedback   |
| **[`prawf`](./plugins/prawf/)**               | Claude plugin | Multi-agent academic peer review — 9-persona committee, pure markdown       |
| **[`yt-dlp-mcp`](./mcp-servers/yt-dlp-mcp/)** | MCP server    | YouTube transcripts, metadata, comments & media for any MCP app             |

---

## Development Environment Setup

```bash
# Clone repository
dir=your-ogham && git clone https://github.com/vincent-kk/ogham.git "$dir" && cd "$dir"

# Install dependencies
nvm use && yarn install && yarn build:all

# Use yarn workspaces
yarn workspace <package-name> <command>

# Run tests
yarn workspace <package-name> test

# Build
yarn workspace <package-name> build
```

---

## Compatibility

This package is built with ECMAScript 2022 (ES2022) syntax.

If you're using a JavaScript environment that doesn't support ES2022, you'll need to include this package in your transpilation process.

**Supported environments:**

- Node.js 20.0.0 or later

**For legacy environment support:**
Please use a transpiler like Babel to transform the code for your target environment.

---

## Scripts

- `yarn build:all` — Build all packages
- `yarn test` — Run tests across all packages
- `yarn lint` — Check code style
- `yarn typecheck` — Verify TypeScript types
- `yarn tag:packages <commit>` — Create Git tags for all packages based on their versions

---

## License

This repository is provided under the MIT license. For more details, please refer to the [`LICENSE`](./LICENSE) file.

---

## Contact

If you have any questions or suggestions related to the project, please create an issue.

[Korean documentation (README-ko_kr.md)](./README-ko_kr.md) is also available.
