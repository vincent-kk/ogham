---
rule_id: naming-convention
rule_name: Document Naming Conventions
severity: warning
category: naming
auto_fix: partial
version: 1.0.0
---

# Document Naming Conventions

## Purpose

Enforce consistent naming conventions for documents in the knowledge space.
Ensure discoverability and automation compatibility.

## Rule Definitions

### R1. Kebab-case Filenames

All markdown documents must be named in kebab-case.

```
# Correct examples
typescript-generics.md
react-hooks-guide.md
api-design-principles.md

# Violation examples
TypeScript_Generics.md    # PascalCase + underscore
react hooks guide.md      # contains spaces
apiDesignPrinciples.md    # camelCase
```

### R2. Lowercase Letters + Digits + Hyphens

Allowed characters in filenames: `a-z`, `0-9`, `-`
Only `.md` extension is permitted.

```
# Correct examples
01-getting-started.md
advanced-patterns-v2.md

# Violation examples
시작하기.md               # Korean filename
README.md                 # uppercase (exception item)
notes.txt                 # non-.md extension
```

### R3. 100-line Limit Warning

Documents exceeding 100 lines receive a recommendation to split.
Knowledge nodes should remain atomic to improve graph traversal efficiency.

```
⚠️ Document exceeds 100 lines (current: {lines} lines)
   Target: {path}
   Consider splitting: auto-split available via /maencof:organize
```

### R4. Directory Naming Rules

Layer subdirectories must be named in kebab-case.
Layer root directories are fixed: `01_Core`, `02_Derived`, `03_External`, `04_Action`.

```
# Correct examples
02_Derived/programming/typescript-basics.md
03_External/book-notes/clean-code.md

# Violation examples
02_Derived/Programming/typescript-basics.md   # PascalCase directory
02_Derived/book_notes/clean-code.md           # underscore
```

## Auto-fix

- **R1/R2 violations**: Automatically convert filename to kebab-case (after user confirmation)
- **R3 violations**: Auto-fix not available; guided splitting via `/maencof:organize` skill
- **R4 violations**: Automatically convert directory name to kebab-case (after user confirmation)

## Exceptions

- `README.md`, `CHANGELOG.md`, `LICENSE.md` — uppercase allowed by project convention
- Files inside `.maencof/` and `.maencof-meta/` are excluded from this rule
- `index.md` — index file allowed
