# filid-setup — Reference Documentation

Detailed workflow, templates, and rules for the FCA-AI initialization skill.
For the quick-start guide, see [SKILL.md](./SKILL.md).

## Section 0 — Environment Setup Details

Before starting the scanning workflow, ensure the FCA-AI project infrastructure is in place.

### Step 1: Create `.filid/` directory

```bash
mkdir -p .filid
```

### Step 2: Initialize `.filid/config.json`

If `.filid/config.json` does not exist, create it with the default rule configuration:

```json
{
  "version": "1.0",
  "rules": {
    "naming-convention": { "enabled": true, "severity": "warning" },
    "organ-no-intentmd": { "enabled": true, "severity": "error" },
    "index-barrel-pattern": { "enabled": true, "severity": "warning" },
    "module-entry-point": { "enabled": true, "severity": "warning" },
    "max-depth": { "enabled": true, "severity": "error" },
    "circular-dependency": { "enabled": true, "severity": "error" },
    "pure-function-isolation": { "enabled": true, "severity": "error" },
    "zero-peer-file": { "enabled": true, "severity": "warning" }
  }
}
```

Do NOT overwrite an existing `config.json` — the user may have customized rule settings.

### Step 3: Create `.claude/rules/fca.md`

If `.claude/rules/fca.md` does not exist, copy the FCA architecture and rules guide.
The template source is `templates/rules/fca.md` in the filid plugin directory.

This file is loaded natively by Claude Code as a system rule, ensuring strong adherence
to FCA-AI architectural principles. Do NOT overwrite an existing file.

### Step 4: Gitignore recommendation

If `.filid/review/` or `.filid/cache/` are not in `.gitignore`, inform the user:

```
[INFO] Consider adding to .gitignore:
  .filid/review/
  .filid/cache/
```

`.filid/config.json` and `.claude/rules/fca.md` should be committed to version control.

---

## Section 1 — Directory Scan Details

Call `fractal_scan` to retrieve the complete project hierarchy by scanning the filesystem.

```
fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReport` containing:
- `tree.nodes`: Map of path → FractalNode (with `name`, `path`, `type`, `hasIntentMd`, `hasDetailMd`, `children`)
- `tree.nodesList`: flat array of all FractalNode objects (for convenient iteration)
- `tree.root`: root directory path
- `modules`: optional ModuleInfo list (empty unless `includeModuleInfo: true`)

> **Important — `tree.nodes` is an object (dict) in JSON, NOT an array.**
> Use `tree.nodesList` for safe array iteration. Use `tree.nodes["/path"]` for path-based lookup.

Build an internal working list of all directories from `tree.nodesList` (or `tree.nodes`) for Phase 2 classification.

> **Note**: Do NOT use `fractal_navigate(action: "tree")` for scanning — that tool
> builds a tree only from a pre-supplied `entries` array and does not read the filesystem.

> **Important**: `tree.nodes` in the `fractal_scan` response contains **all**
> directories, including those nested inside organ nodes. In Phase 2, always
> iterate over the full `tree.nodes.values()`. Traversing only `children` from
> `tree.root` will miss fractal nodes that live inside organ boundaries.

## Section 2 — Node Classification Rules

For each directory, call `fractal_navigate` with `action: "classify"`:

```
fractal_navigate({
  action: "classify",
  path: "<directory-path>",
  entries: [/* child entries from tree */]
})
```

Apply the following decision logic in order:

| Condition                               | Node Type     | Action                                  |
| --------------------------------------- | ------------- | --------------------------------------- |
| `hasIntentMd === true`                  | fractal       | Preserve existing file, skip generation |
| `hasDetailMd === true`                  | fractal       | Preserve existing file, skip generation |
| Directory name in `KNOWN_ORGAN_DIR_NAMES` | organ       | Skip — INTENT.md is prohibited          |
| No fractal children + leaf directory    | organ         | Skip — INTENT.md is prohibited          |
| No observable side effects, stateless   | pure-function | No INTENT.md needed                     |
| Default (none of the above)             | fractal       | Generate INTENT.md                      |

`KNOWN_ORGAN_DIR_NAMES` (name-based, always organ regardless of structure):

- **UI/shared**: `components`, `utils`, `types`, `hooks`, `helpers`, `lib`, `styles`, `assets`, `constants`
- **Test/infra**: `__tests__`, `__mocks__`, `__fixtures__`, `test`, `tests`, `spec`, `specs`, `fixtures`, `e2e`

Pattern-based organ rules (applied before name list, after INTENT.md/DETAIL.md check):

| Pattern | Example | Classification |
| ------- | ------- | -------------- |
| `__name__` (double-underscore wrapped) | `__tests__`, `__mocks__`, `__custom__` | organ |
| `.name` (dot-prefixed) | `.git`, `.github`, `.vscode`, `.claude` | organ |

> **Important**: Pattern rules apply regardless of directory structure (leaf or
> not). An explicit INTENT.md always takes precedence over pattern matching.

### Deep Scan — Fractal Nodes Inside Organ Directories

Organ nodes are never INTENT.md targets, but fractal nodes can exist inside
them. Phase 2 must handle this by scanning the full `tree.nodes` map.

**Core rules**:
- Organ node itself → skip INTENT.md generation, but continue scanning inside
- Fractal node inside an organ → eligible for INTENT.md generation
- Organ node inside an organ → skip INTENT.md generation, continue scanning

**Traversal algorithm** (iterate `tree.nodes` directly):

```
for each node in tree.nodes.values():
  if node.type === 'fractal' or 'pure-function':
    → include as a classification target (even if located inside an organ)
  if node.type === 'organ':
    → skip INTENT.md generation; sub-nodes are handled by the same loop
```

**Example — three levels of organ nesting**:

```
/app/src (fractal)                                      ← INTENT.md target
  /app/src/components (organ)                           ← skip
    /app/src/components/location (fractal, reclassified) ← INTENT.md target ✓
      /app/src/components/location/FindLocationModal
        (fractal)                                        ← INTENT.md target ✓
```

> `location` is not in `KNOWN_ORGAN_DIR_NAMES` and has a fractal child, so the
> post-correction pass in `scanProject()` automatically reclassifies it as
> fractal and places it in `components.children[]`.

## Section 3 — INTENT.md Generation Template

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

## Section 4 — DETAIL.md Scaffolding

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

## Section 5 — Validation and Report Format

After all files are written, validate the resulting structure:

- Each fractal node's INTENT.md passes `validateIntentMd()` (≤ 50 lines,
  3-tier boundary sections present)
- No organ directory contains a INTENT.md
- All DETAIL.md files pass `validateDetailMd()`

Print a summary report:

```
FCA-AI Init Report
==================
Directories scanned : <n>
Fractal nodes       : <n>
Organ nodes         : <n>
Pure-function nodes : <n>
INTENT.md created   : <n>
DETAIL.md created     : <n>
Warnings            : <list or "none">
```
