# filid-setup — Node Classification (Phase 2)

> Detail reference for Phase 2 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

For each directory, call `mcp_t_fractal_navigate` with `action: "classify"`:

```
mcp_t_fractal_navigate({
  action: "classify",
  path: "<directory-path>",
  entries: [/* child entries from tree */]
})
```

Apply the following decision logic in order:

| Condition                                 | Node Type     | Action                                  |
| ----------------------------------------- | ------------- | --------------------------------------- |
| `hasIntentMd === true`                    | fractal       | Preserve existing file, skip generation |
| `hasDetailMd === true`                    | fractal       | Preserve existing file, skip generation |
| Directory name in `KNOWN_ORGAN_DIR_NAMES` | organ         | Skip — INTENT.md is prohibited          |
| No fractal children + leaf directory      | organ         | Skip — INTENT.md is prohibited          |
| No observable side effects, stateless     | pure-function | No INTENT.md needed                     |
| Default (none of the above)               | fractal       | Generate INTENT.md                      |

`KNOWN_ORGAN_DIR_NAMES` (name-based, always organ regardless of structure):

- **UI/shared**: `components`, `utils`, `types`, `hooks`, `helpers`, `lib`, `styles`, `assets`, `constants`
- **Test/infra** (name-matched): `test`, `tests`, `spec`, `specs`, `fixtures`, `e2e`. `__tests__`, `__mocks__`, `__fixtures__` are **pattern-matched** (priority 3), not list members.
- **Docs**: `references`

Pattern-based organ rules (applied before name list, after INTENT.md/DETAIL.md check):

| Pattern                                | Example                                 | Classification |
| -------------------------------------- | --------------------------------------- | -------------- |
| `__name__` (double-underscore wrapped) | `__tests__`, `__mocks__`, `__custom__`  | organ          |
| `.name` (dot-prefixed)                 | `.git`, `.github`, `.vscode`, `.claude` | organ          |

> **Important**: Pattern rules apply regardless of directory structure (leaf or
> not). An explicit INTENT.md always takes precedence over pattern matching.

## Deep Scan — Fractal Nodes Inside Organ Directories

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
