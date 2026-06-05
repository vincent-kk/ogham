# skills — prawf peer-review skills

## Purpose

Container for the prawf plugin's user-invocable skills. Each child is a self-contained
skill module (`SKILL.md` + `INTENT.md` + `DETAIL.md`) that orchestrates the shared
persona agents at `../agents/`. The plugin manifest wires this directory via
`"skills": "./skills/"`.

## Structure

| Path                | Role                                                     |
| ------------------- | ------------------------------------------------------- |
| `review/`           | main skill — 9-persona team evaluation (P0→R1→R2→R3→ADJ) |
| `simulate-defense/` | interactive defense Q&A rehearsal + coaching            |
| `rebuttal/`         | external review comments → rebuttal letter + checklist  |

## Conventions

- Each skill is markdown only (no build); `SKILL.md` carries the frontmatter entry.
- Skills reuse the personas at `../agents/` rather than redefining reviewers.
- Persona ids, deliverable filenames, and enums stay identical across skills.

## Boundaries

### Always do

- Give every new skill `SKILL.md` + `INTENT.md` + `DETAIL.md`, in English.
- Reuse the existing personas and the review orchestration contract.

### Ask first

- Adding a new skill (confirm it is not a thin variant of an existing one).

### Never do

- Add an `agents` field to `plugin.json` (agents are auto-discovered from `../agents/`).
- Duplicate persona logic into a skill instead of spawning the persona agent.

## Dependencies

- Personas: `../agents/*.md`. Manifest: `../.claude-plugin/plugin.json`.
