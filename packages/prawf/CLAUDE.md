# CLAUDE.md — @ogham/prawf

Working guide for the `@ogham/prawf` package. See [INTENT.md](./INTENT.md) for the
package contract and [DETAIL.md](./DETAIL.md) for the skill/persona API surface.

> **What this is.** A pure-markdown Claude Code plugin for multi-agent academic
> peer review. Capabilities ship entirely as `skills/` + `agents/` — there is no
> MCP server, no hooks, no esbuild `bridge/`, and no runtime dependency.

## Commands

```bash
yarn prawf version:sync   # mirror package.json version → .claude-plugin/plugin.json
```

There is intentionally no `build`, `typecheck`, or `test` script — the plugin is
markdown only. `build:all` skips this package (it defines no `build` script).

## Architecture

```
/prawf:review            → skills/review/        — 9-persona native team (P0→R1→R2→R3→ADJ)
/prawf:simulate-defense  → skills/simulate-defense/ — committee Q&A → author answers → coaching
/prawf:rebuttal          → skills/rebuttal/      — external review comments → rebuttal letter
agents/<persona>.md      → 10 reviewer personas spawned via Task/TeamCreate
```

Evaluation is persona _reasoning_, not deterministic measurement — that is why the
package carries no analysis tooling. External lookups (prior work, preregistration,
plagiarism) are delegated as a capability; never hardcode a specific tool name.

## Authoring Notes

- **Skills** — drop `skills/<name>/SKILL.md` (English) with `name`,
  `user_invocable`, `description` frontmatter. The `"skills": "./skills/"` field is
  already wired in `plugin.json`.
- **Agents** — drop `agents/<name>.md` (English). Auto-discovered; do NOT add an
  `agents` field to `plugin.json`.
- **Anti-yield** — `skills/review/SKILL.md` follows filid's Tier-2a 3-layer
  pattern (round-to-round chaining, never yield mid-pipeline). An interactive
  `simulate-defense` uses the Tier-2b `<!-- [INTERACTIVE] -->` escape hatch.
- **Cross-references** — persona ids and deliverable filenames must stay identical
  across agents, orchestration, prompt-templates, templates, and every SKILL.md.

## Design SSoT

The Korean design specification is the source of truth at `../../.metadata/prawf/`
(read-only): `personas.md`, `orchestration.md`, `field-profiles.md`, `templates.md`,
`prompt-templates.md`, `scaffold.md`. This package is the English implementation.

## Development Notes

- **Version**: use `yarn prawf version:sync` only; `plugin.json` version is
  generated, never hand-edited.
- **FCA**: root `INTENT.md` (≤ 50 lines, 3-tier boundaries) and `DETAIL.md` are
  written in Korean (section headings stay English as machine-readable anchors).
  A skill is self-describing: a skill directory carries `SKILL.md` only — no
  per-skill `INTENT.md`/`DETAIL.md`. Run `/filid:scan` to check structure.
- **Registration**: listed in root `.claude-plugin/marketplace.json`. Not in
  `scripts/typecheck-all.mjs` (no TypeScript to typecheck).
