# seiri — Agent-legible development

## Purpose

Deploy selected code-authoring rules to the host's project rule channel and provide optional, task-scoped workflow assistance. The host loads deployed rules; hooks never duplicate their bodies or elect the first skill.

## Structure

Rules and TypeScript are canonical. Runtime bundles and host adapters are generated distribution copies; build and validate them separately from source commits.

## Conventions

- Keep MCP tools, hook bundles, skills, and rule text within declared budgets; lifecycle participation has its own contract because hosts do not supply it.
- Rule templates are hashed as raw bytes. Preserve the repository's LF and formatter exclusions.
- Claude source instructions use canonical MCP addresses; plugin-compiler owns vendor adapters.

## Boundaries

### Always do

- Build and verify distribution artifacts; commit regenerated runtime and adapters in a separate build commit after the source commits.
- Keep rule writes behind a host-target and revision-bound preview.
- Preserve independent skill selection and proportionate verification.

### Ask first

- Add a rule only after its unguided comparison has been evaluated.
- Expand the MCP or hook surface.

### Never do

- Enforce architecture, orchestrate agents, own knowledge management, or replace repository verification policy.
- Block tools, inject rule bodies, or write deployed rules without confirmation.
- Treat skill loading or an accepted lifecycle request as completed work.
