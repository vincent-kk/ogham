# settings — Local settings page

## Purpose

Present rule selection, workflow mode, and a preview in one local page. The build inlines static assets; the server supplies current state for each request.

## Structure

The state injection slot must survive minification. The page runs independently of server modules and consumes server-owned channel paths.

## Conventions

- Use filesystem rule state for defaults; preselect recommendations only when no rules are deployed.
- Offer template replacement per drifted row, with an explicit choice to preserve local edits.
- Refresh preview and revision whenever selections change.
- Keep advanced information collapsible and match the shared settings design language.
- Label off as Skills only. It prevents new observations and injection; trusted boundaries may revoke existing participation.
- The config_scope toggle controls both dial scope and deployment channel. Preserve data-config-path and data-scope-state ownership markers from the shared settings contract.
- Use both server-supplied scope snapshots when switching scope and request a fresh plan.
- Do not offer project baseline deletion as a settings toggle; its ownership is version control.

## Boundaries

### Always do

- Insert user strings through textContent.
- Give every mode a visible label, accurate help, and keyboard radio navigation.
- Show the exact preview before saving; preserve drift choices per row.

### Ask first

- Add form sections or change shared design tokens.

### Never do

- Import server modules or fetch external resources, fonts, or CDNs.
- Render unsaved file changes as already applied.
