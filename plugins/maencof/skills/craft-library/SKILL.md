---
name: craft-library
user-invocable: true
disable-model-invocation: true
description: 'Creates a vault-local static HTML library outside Maencof layer search and installs a host-local manage-library skill. Use when setting up a browsable collection of standalone HTML articles in a vault.'
---

# craft-library

Create the functional shell for a static HTML library, then leave recurring article work to the generated `manage-library` skill.

## Workflow

1. Resolve the vault root from the user's path, the active workspace, or the current directory. Do not infer a different vault when the target is ambiguous.
2. Select the current host:
   - Codex: `codex`
   - Claude Code: `claude`
3. Run `node <this-skill>/scripts/craft-library.mjs <vault-root> --host <host>`.
4. Read only the final JSON line. It reports the library and installed skill paths.
5. If the user requested dashboard integration and an existing dashboard is identifiable, add one navigation-only link that opens in a new tab with `rel="noopener"`. Resolve the href through an existing relative-file or static-file route. Do not invent a server, route, or dependency merely to expose the file; when no existing route can reach it, report that limitation and return the library path instead. Never register the library with dashboard search, GraphStore, layer data, or backend ingestion.
6. Report that Obsidian search/exclusion settings remain a manual user choice.

## Result

The scaffold creates this vault-local boundary:

```text
library/
  index.html
  articles/
  styles/index.css
  scripts/
  assets/
```

It also installs `manage-library` for the current host:

- Codex: `<vault>/.agents/skills/manage-library/`
- Claude Code: `<vault>/.claude/skills/manage-library/`

Re-run this skill under the other host to install that host's local copy. The scaffold preserves existing library files, including vault-owned styles and assets. It refreshes only a previously generated `manage-library`; a same-named user-owned skill is a hard conflict and must not be overwritten.

## Boundaries

### Always do

- Keep the library at `<vault>/library`, outside layer Markdown.
- Treat HTML as an opaque artifact; recurring work belongs to `manage-library`.
- Keep every catalog lookup metadata-only.
- Preserve existing library files during repeat setup.

### Ask first

- Replacing a user-owned `manage-library` skill.
- Adding a dashboard link when more than one dashboard target is plausible.

### Never do

- Read a full article merely to create metadata.
- Add HTML body text to the generated catalog or dashboard search.
- Modify `.maencof/`, layer Markdown, Obsidian settings, or dashboard ingestion.
- Install packages or start a server; the library works through `file://` with classic scripts.
