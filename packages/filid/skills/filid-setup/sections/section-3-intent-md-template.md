# filid-setup — INTENT.md Generation Template (Phase 3)

> Detail reference for Phase 3 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

For each directory classified as fractal that does not yet have a INTENT.md,
generate one using the context-manager agent.

INTENT.md structure (hard limit: 50 lines):

```markdown
# <Module Name>

## Purpose

<1–2 sentence description of what this module does>

## Structure

<key files and sub-directories with one-line descriptions>

## Conventions

<language, patterns, naming rules specific to this module>

## Boundaries

### Always do

- <rule 1>
- <rule 2>

### Ask first

- <action that requires user confirmation before proceeding>

### Never do

- <prohibited action 1>
- <prohibited action 2>

## Dependencies

<list of modules this directory depends on>
```

**Language**: Section headings (`## Purpose`, `## Structure`, `## Conventions`, `## Boundaries`, `### Always do`, `### Ask first`, `### Never do`, `## Dependencies`) MUST remain in English. All content text MUST be written in the language specified by the `[filid:lang]` tag. If no tag is present, follow the system's language setting; default to English.

Enforce: file must not exceed 50 lines. If generation would exceed the
limit, summarize the most important conventions and boundary rules.
