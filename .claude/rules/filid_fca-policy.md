# FCA-AI Rules

**Every module is a fractal. Every boundary is enforced. The graph is a DAG.**

- Modules document intent in `INTENT.md` and current contracts in `DETAIL.md`.
- Consumers cross a module only through an adapter-reported entry point.
- Documentation precedes code. `INTENT.md` is at most 50 lines.
- Verification documents are roles, not a promotion ladder: spec-document ≤15 cases,
  test-record ≤32 cases per file.

Fractal Context Architecture (FCA-AI) recursively organizes independent modules as
fractal nodes. Each fractal owns a contract and a public boundary. Organs are internal
compartments owned by one fractal. Dependency edges MUST form a DAG.

## Product Boundary

Filid owns:

- INTENT/DETAIL document contracts and minimal context chains;
- fractal/organ/pure-function/hybrid classification;
- entry-point surfaces, external import boundaries and the dependency DAG;
- lowest common fractal placement and read-only `sourcePath → targetPath` plans;
- verification-document roles, file caps, fragmentation and contract links;
- FCA-scoped cross-review evidence.

Filid does not own function splitting, naming, file size, cyclomatic complexity, LCOM4,
coverage quality, fail-first practice, general AST editing, file moves, import rewrites,
commits, pushes or pull requests. A restructure tool plans and validates; an external
actor performs the change.

## Node Types

| Type            | INTENT.md | Children | Entry point | Meaning                                      |
| --------------- | --------- | -------- | ----------- | -------------------------------------------- |
| `fractal`       | required  | allowed  | required    | Independent module with a public contract    |
| `organ`         | forbidden | files    | not required| Internal compartment owned by one fractal    |
| `pure-function` | optional  | none     | not required| Explicitly isolated effect-free FCA unit     |
| `hybrid`        | optional  | allowed  | required    | Manually assigned transitional node          |

## Node Classification Priority

Classification uses this strict order:

1. `INTENT.md` or `DETAIL.md` present → `fractal`.
2. Directory name in the configured known organ list → `organ`.
3. Double-underscore-wrapped or dot-prefixed infrastructure name → `organ`.
4. A registered StructureAdapter reports a **module index** → `fractal`.
5. An adapter proves both statelessness and no side effects → `pure-function`.
6. Otherwise → `organ`.

Step 4 reads one signal only: a module index. Of the entry points an adapter reports,
only `kind: "module"` classifies. An `executable` or `framework` entry, and any path
injected by the config `entryPointOverrides`, never turns a directory into a fractal.
Core still knows no filenames — it asks the adapter whether a module index exists here.
`entryPointOverrides` feeds `entry-point-surface`, not classification. Without that
split, markdown-as-implementation such as `SKILL.md` would make a directory a fractal
and subject prose to rules written for code.

Step 6 is `organ` on purpose. A directory that declares neither a document nor an index
has never claimed an independent contract, so it is not a fractal. A default of
`fractal` manufactures "add INTENT.md" demands and makes classification depend on
incidentals — whether a directory happens to have a subdirectory, for instance.

**Classification describes; it never prescribes.** What a node *is* comes from files
that exist. What a node *should be* is a rule result, not a classification: an organ
consumed from outside its owner's subtree has an external boundary, and
`external-import-boundary` reports that with the consumer paths as evidence. Keeping
the two apart is what lets a non-FCA codebase be adopted — the scanner names the
fractals that are missing instead of silently assuming them.

`hybrid` is never auto-classified. An unsupported purity analysis is not proof of purity.
Traversal continues inside organs: a nested directory with documents or a module index
is reclassified as its own fractal.

Default organ names are `components`, `utils`, `types`, `hooks`, `helpers`, `lib`,
`styles`, `assets`, `constants`, `test`, `tests`, `spec`, `specs`, `fixtures`, `e2e`
and `references`. Config may extend this FCA convention.

## Adapter Boundary

Core, policy and MCP DTOs MUST NOT encode programming-language extensions, entry-point
filenames, framework route names or test-framework call syntax. Registered adapters
provide those facts.

- Equal-confidence ownership claims for one file are an
  `ambiguous-adapter-claim` error.
- A file owned by no adapter is `unsupported`.
- A requested but unregistered adapter ID is a validation finding.
- `indeterminate` and `unsupported` evidence MUST NOT be converted to PASS.
- Adding an ecosystem adapter MUST NOT require changes to core types, policy rules or
  MCP schemas.

## Built-in Structural Rules

### intent-document-contract

- `INTENT.md` MUST be at most 50 lines.
- It MUST contain `Always do`, `Ask first` and `Never do` boundary sections.
- An organ MUST NOT use INTENT as local documentation.

### detail-document-contract

- `DETAIL.md` MUST describe current state, not append-only history.
- It MUST contain `Requirements`, `API Contracts`, `Acceptance Criteria` and
  `Last Updated`.
- Acceptance groups use stable IDs unique within that DETAIL document.

### organ-no-intentmd

- An organ MUST NOT contain `INTENT.md`.
- Independent documentation means the directory should be reclassified as a fractal.

### entry-point-surface

- A fractal or hybrid public surface MUST be adapter-inspectable.
- An enumerated surface declares exports by name; widening it is a contract change.
- Opaque or unsupported framework surfaces retain their certainty instead of passing.

### module-entry-point

- Every fractal and hybrid MUST have an adapter-reported module, executable or framework
  entry point.
- Organs and pure-function nodes do not require one.

### max-depth

- A node MUST stay within the configured structural depth.
- Depth is measured from the scanned project root over classified nodes.

### circular-dependency

- The dependency graph MUST be acyclic.
- A cycle result includes source files and resolved dependency evidence.
- If unresolved dependencies can change the cycle conclusion, the result is
  `indeterminate`.

### pure-function-isolation

- A pure-function node MUST NOT depend on a fractal or hybrid.
- If isolation cannot be proven, reclassify or pass dependencies as inputs.

### zero-peer-file

- A fractal root contains documents, adapter-reported entry points, at most one
  eponymous implementation, and adapter-confirmed framework peers.
- Other implementation files belong in an organ or child fractal unless config grants a
  scoped allowed-peer override.

### external-import-boundary

- External consumers import only an entry point of the target fractal.
- Files inside one fractal import concrete internal peers directly, not their local
  public entry point.
- Sibling fractals import the sibling entry point, never an internal file and never a
  shared parent barrel that re-exports the sibling.

An organ has no entry point, so "route through the entry point" cannot apply to it.
Organ access is judged by where the consumer sits:

| Consumer                        | Path                              | Verdict                          |
| ------------------------------- | --------------------------------- | -------------------------------- |
| Inside the owner's subtree      | organ file, directly              | allowed                          |
| Outside                         | the owner fractal's entry point   | allowed — needs a retention reason |
| Outside                         | organ file, directly              | violation — unless exempted      |

Inside the owner's subtree a nested fractal may import an organ's concrete files
directly. That is the shape LCA placement produces: shared code sits at the lowest
common fractal of its consumers precisely so those descendants can use it.

When the owner's entry point re-exports an organ symbol, external use is legitimate —
but a unit with external consumers naturally belongs at *their* lowest common fractal,
so staying put is a deliberate choice that carries a reason.

Direct import from outside is sometimes correct. The standing case is a bundle that
must not pull in what a barrel re-exports — hook scripts, where importing the barrel
drags every re-exported module into the hook bundle. Such an exemption is declared, not
assumed, and it carries its reason.

Both the retention reason and the direct-import exemption are declared in the owning
fractal's `DETAIL.md`. Declare them only when an exemption is actually needed; a fractal
that needs one and has no `DETAIL.md` adds one for this purpose.

An organ consumed from outside its owner's subtree with neither a declaration nor an
exemption is the signal that it has an external boundary. The finding names both
resolutions — promote it to a fractal, or move it to its consumers' lowest common
fractal — and cites the consumer paths. Filid does not choose between them.

### spec-document-case-cap

- A spec-document contains at most 15 semantic cases.

### test-record-case-cap

- A test-record contains at most 32 semantic cases per file.
- Project-wide test-record file and case totals are unlimited.

### spec-fragmentation

- Multiple spec-documents may not split one acceptance group merely to evade the cap.
- Contract group sets declared by sibling spec-documents MUST NOT overlap.

### spec-contract-link

- When one fractal has multiple spec-documents, it MUST have a DETAIL document.
- Each spec-document declares at least one existing DETAIL acceptance group through the
  adapter-recognized `filid:contract <group-id>` marker.

## Verification Semantics

The adapter classifies verification files by role, independent of filename:

- `spec-document`: current executable contract; maximum 15 semantic cases.
- `test-record`: QA, regression and incident history; maximum 32 cases per file.

Counting rules:

- a normal case, skip or todo counts as one;
- statically enumerable parameter rows count by row;
- a case inside a static parameterized suite multiplies by the suite row count;
- a property declaration counts as one regardless of generated trials;
- dynamic tables, unknown wrappers or ambiguous aliases are `indeterminate`.

Never remove coverage to meet a cap. Split test-records by behavior or incident, and
organize spec-documents by non-overlapping DETAIL acceptance groups. Test-records are not
promoted into spec-documents.

## Documentation Contracts

### INTENT.md

- Section headings `Purpose`, `Structure`, `Conventions`, `Boundaries`, `Always do`,
  `Ask first`, `Never do` and `Dependencies` remain in English.
- Descriptive content follows `[filid:lang]`, defaulting to English.
- Record only the fractal's own purpose, ownership and boundaries; do not copy ancestors.
- Update only when the public boundary or contract changes.
- A misleading conventional name is called out in `Structure`.

### DETAIL.md

- Section headings `Requirements`, `API Contracts`, `Acceptance Criteria` and
  `Last Updated` remain in English.
- Descriptive content follows `[filid:lang]`, defaulting to English.
- Restructure the document to current intended behavior on every update.
- Update DETAIL before code.
- `DETAIL.md` is the sole acceptance-criteria ledger.
- Legacy `.filid/criteria.md` is reported as `legacy-criteria-ledger`; it is never
  auto-deleted or silently migrated.
- `Organ Exemptions` is conditional: present only when this fractal actually grants one.
  A fractal with no exemption never carries the section, and a fractal that needs one
  and has no `DETAIL.md` adds the document for this purpose.

An exemption entry uses the acceptance-group shape, so one parser reads both:

```md
## Organ Exemptions

### <organ path> — <short title>

- **Consumers**: <paths or globs, or `entry-point` when access is through the barrel>
- **Direct import**: allowed | not allowed
- **Reason**: <why the barrel cannot serve these consumers, or why the organ has not
  moved to its consumers' lowest common fractal>
```

`Reason` is the load-bearing field. An exemption without one is a disabled rule wearing
a declaration, and the scan treats a missing or empty reason as an unmet contract rather
than a granted exemption.

## Placement and Restructure

- Shared code goes under the lowest common **fractal** of its consumer owners.
- A single-consumer internal unit defaults to an organ of that owner.
- An independent public contract becomes a child fractal with intent, detail and entry
  point artifacts.
- An organ cannot be an LCA.
- If no meaningful organ name is supported by evidence, the plan sets
  `requiresDecision: true`; do not invent `shared` or `common`.
- A plan reports normalized absolute source and target paths, basis, consumers, LCA,
  required artifacts, import rewrites and decision reasons.
- Planning is read-only. It may write only an ephemeral plan artifact.
- A precondition checks the snapshot hash immediately before execution.
- A postcondition checks exact target, source absence, node type, documents, entry point,
  import boundary, required rewrites and DAG. A functionally working but different target
  fails.

## Cross-review Scope

Filid cross-review uses only:

- changed INTENT/DETAIL contracts and acceptance groups;
- node ownership and classification;
- entry-point surface and external import boundary;
- dependency DAG evidence;
- LCA placement and approved restructure-plan postconditions;
- verification roles, 15/32 caps, fragmentation, links and certainty.

Its contract, structure and verification perspectives produce one opinion round. An
adversarial verifier classifies blocking findings as `CONFIRMED`, `PLAUSIBLE` or
`REFUTED`. Refuted findings stay in the arbitration log but not the verdict. The verdict
is explicitly FCA-scoped.

## Structure Principles

- A new fractal gets INTENT, DETAIL and a named-export entry point.
- A leaf utility organ stays flat and has no INTENT.
- Shared code is placed at the nearest common fractal ancestor of consumers.
- Dependency edges point from consumers to sibling entry points and never form cycles.
- A new implementation file does not remain as an unclassified fractal-root peer.

## Development Workflow

Before implementation that touches a fractal:

1. Identify every affected fractal.
2. Update each affected DETAIL contract.
3. Update INTENT when a public interface or boundary changes.
4. For new behavior or fixes, write a check and observe the intended failure.
5. Implement the minimum change.
6. Run scoped verification and the FCA scan; warnings count as findings.
7. Record the result and any plan deviation before moving to the next review seam.
