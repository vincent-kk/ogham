# filid-setup — DETAIL.md Scaffolding (Phase 4)

> Detail reference for Phase 4 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

For fractal modules that expose a public API and lack a DETAIL.md, generate
a scaffold:

```markdown
# <Module Name> Specification

## Requirements

- <functional requirement>

## API Contracts

- <function signature and expected behaviour>

## Last Updated

<ISO date>
```

**Language**: Section headings (`## Requirements`, `## API Contracts`, `## Last Updated`) MUST remain in English. Content follows the language specified by the `[filid:lang]` tag. If no tag is present, follow the system's language setting; default to English.

Only create DETAIL.md when the module clearly has an API surface worth
specifying. Do not create DETAIL.md for leaf utility directories.
