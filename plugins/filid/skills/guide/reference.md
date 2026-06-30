# guide — Reference Documentation

Detailed workflow, MCP tool call signatures, and output format templates for the
fractal structure `filid:guide` skill. For the quick-start overview, see [SKILL.md](./SKILL.md).

## Section 1 — Project Scan

Call `mcp__plugin_filid_t__fractal_scan` to retrieve the complete directory tree and node classifications.

```
mcp__plugin_filid_t__fractal_scan({ path: "<target-path>" })
```

The response is a `ScanReportDto` containing:

- `tree.nodes`: **flat array** of FractalNode objects (with `name`, `path`, `type`, `hasIntentMd`, `hasDetailMd`, `children`)
- `tree.root`: root directory path
- `tree.totalNodes`: total node count
- `modules`: optional ModuleInfo list (empty unless `includeModuleInfo: true`)

Build three working sets from `tree.nodes` (e.g. `tree.nodes.filter(...)`):

- **fractal nodes** — `type === "fractal"` or `hasIntentMd === true`
- **organ nodes** — `type === "organ"`
- **pure-function / hybrid nodes** — remaining types

## Section 2 — Rule Query

Call `mcp__plugin_filid_t__rule_query` to retrieve the full list of active rules.

```
mcp__plugin_filid_t__rule_query({ action: "list", path: "<target-path>" })
```

Response fields:

- `rules`: Array of rule objects (`id`, `name`, `category`, `severity`, `description`, `examples`)

Rule categories (`RuleCategory`):

- `naming` — Directory and file naming conventions
- `structure` — Node structure and hierarchy rules
- `dependency` — Import/export dependency rules
- `documentation` — Documentation requirements
- `index` — index.ts barrel export rules
- `module` — main.ts entry point rules

## Section 3 — Classification Summary

Build the category distribution table by counting `tree.nodes` from the scan
response by node type (the response has no precomputed `summary` object):

```
categoryTable = {
  fractal:      count of tree.nodes where type == "fractal",
  organ:        count of tree.nodes where type == "organ",
  pureFunction: count of tree.nodes where type == "pure-function",
  hybrid:       count of tree.nodes where type == "hybrid",
  total:        tree.totalNodes
}
```

If violations are present, sort by severity and include them in the summary section
so readers understand the current health status before the rule list.

## Section 4 — Guide Document Output

### Standard output format

```
## filid Fractal Structure Guide — <target path>

### Project Structure Status
| Category | Nodes | Description |
|----------|-------|-------------|
| fractal | N | Stateful or hierarchical modules |
| organ | N | Shared utility / component directories |
| pure-function | N | Stateless pure-function modules |
| hybrid | N | Mixed fractal + organ modules |
| Total | N | — |

Current violations: N (error: X, warning: Y, info: Z)

### Active Rules

#### naming rules
| Rule ID | Severity | Description |
|---------|----------|-------------|
| HOL-N001 | error | Names must use camelCase (default), kebab-case, or PascalCase |

#### structure rules
| Rule ID | Severity | Description |
|---------|----------|-------------|
| HOL-S001 | error | Organ directories must not contain fractal children |
| HOL-S002 | warning | Fractal nodes must have an index.ts barrel export |

#### index rules
| Rule ID | Severity | Description |
|---------|----------|-------------|
| HOL-I001 | warning | index.ts must re-export all public symbols |

(Remaining rule categories follow the same format)

### Category Classification Criteria
| Category | Identification Criteria |
|----------|------------------------|
| fractal | Holds state, contains fractal children, or default classification |
| organ | Leaf directory with no fractal children (structure-based auto-classification) |
| pure-function | Stateless, no side effects, no I/O |
| hybrid | Contains both fractal children and organ-like files |

### New Module Checklist
- [ ] Does the directory name follow the accepted convention (camelCase by default; kebab-case or PascalCase per domain) — or, in a detected framework, a route-segment pattern such as `(app)`/`[id]`?
- [ ] If classified as organ, does it have no fractal children?
- [ ] If classified as fractal, does it have an `index.ts` — or, in a detected framework, a framework entry file such as `page.tsx`/`route.ts`?
- [ ] If there is a primary feature, does it have a main.ts?
- [ ] Are no fractal children placed under an organ directory?

(If violations exist)
⚠ N violation(s) detected. Run /filid:sync to apply corrections.
```
