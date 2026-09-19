# Fractal Boundaries

> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > filid defaults — the higher source wins. Fractal Context Architecture organizes a codebase as nested independent modules: a fractal owns a contract and a public boundary; an organ is an internal compartment owned by exactly one fractal. The tree is read before the code: one listing should tell modules from their supporting compartments, and a unit's path should tell how far a change to it can reach. Applies when the repository has adopted FCA — module documents or a filid configuration are present.

## 1. Classification comes from files that exist

| Type            | INTENT.md | Children | Entry point  | Meaning                                   |
| --------------- | --------- | -------- | ------------ | ----------------------------------------- |
| `fractal`       | required  | allowed  | required     | Independent module with a public contract |
| `organ`         | forbidden | files (nested dirs classify on their own) | not required | Internal compartment owned by one fractal |
| `pure-function` | optional  | none     | not required | Explicitly isolated effect-free unit      |
| `hybrid`        | optional  | allowed  | required     | Manually assigned transitional node       |

Resolve in this strict order: (1) `INTENT.md` present → fractal; (2) `DETAIL.md` present → fractal — a missing-INTENT signal; (3) double-underscore-wrapped or dot-prefixed infrastructure name → organ; (4) name in the known organ list → organ; (5) a registered adapter reports a **module** index → fractal; (6) a leaf directory with no fractal children → organ; (7) an adapter proves both statelessness and no side effects → pure-function; (8) otherwise → organ. Only module entries classify; executable, framework, manifest and `entryPointOverrides` entries feed the entry-point surface instead. A leaf that never claimed isolation is an organ even when nothing in it has an effect.

- Default organ names: `components`, `utils`, `types`, `hooks`, `helpers`, `lib`, `styles`, `assets`, `constants`, `test`, `tests`, `spec`, `specs`, `fixtures`, `e2e`; config extends the list via `structure.additionalOrganNames`. Docs-as-code names (`references`, `docs`, `plans`) stay off it — one would silently reclassify a real code module of that name.

## 2. Classification describes; it never prescribes

Traversal continues inside organs: a nested directory with its own documents or module index is its own fractal. `hybrid` is never auto-assigned, and unproven purity stays an organ. What a node _should_ be is a rule result, not a classification: an organ consumed from outside its owner's subtree is reported with the consumer paths as evidence, never silently reclassified — which is what lets a non-FCA codebase be adopted.

When the shape is yours to decide: a directory that others call by name while its internals stay free to change is a fractal — whether or not the package publishes it — and a fractal owns the implementation of its contract. An entry point that only re-exports a parent's organs is a facade, not a fractal: move the implementation in, or drop the claim.

## 3. A fractal is crossed through its entry point

Every fractal and hybrid has an adapter-reported module, executable, framework or manifest entry point — a package manifest that declares the public surface IS the boundary; it states a surface, it does not classify — and organs and pure-function nodes need none. An enumerated surface declares its exports by name, and widening it is a contract change; an opaque or unsupported framework surface keeps its uncertainty instead of passing. Sibling fractals import the sibling's entry point — never an internal file, and never a shared parent barrel that re-exports the sibling — while inside one fractal, files import concrete internal peers directly, not their own local entry point.

A published subpath is an address for outside consumers, not a unit of ownership. When in-package consumers need more than the public gets, separate the published facade from the fractal's entry point — never lift the implementation out to keep the surface small.

## 4. A fractal root holds documents and entry points, not code

A fractal root contains its documents, adapter-reported entry points, at most one eponymous implementation, and adapter-confirmed framework peers. Any other implementation file belongs in an organ or a child fractal, unless config grants a scoped allowed-peer override.

Beside those, a fractal's level shows two kinds of directory, told apart by name alone: child fractals, named for their responsibility, and compartments under conventional organ names (§1's list). A topic-named organ sits inside a compartment, not beside the child fractals. Compartments may be several and may hold fractals; a level that exists to tell kinds apart is judged only by whether the listing got easier to read.

## 5. Organ access is judged by where the consumer sits

An organ has no entry point, so "route through the entry point" cannot apply to it. An organ offers the units at its top; its nested directories serve those units and are reached from nowhere else.

| Consumer                   | Path                            | Verdict                            |
| -------------------------- | ------------------------------- | ---------------------------------- |
| Inside the owner's subtree | organ file, directly            | allowed                            |
| Outside                    | the owner fractal's entry point | allowed — needs a retention reason |
| Outside                    | organ file, directly            | violation — unless exempted        |

- Inside the owner's subtree a nested fractal may import an organ's concrete files directly — that is the shape lowest-common-fractal placement produces.
- A unit with external consumers belongs at _their_ lowest common fractal, so staying put is a deliberate choice that carries a reason; a direct import from outside is sometimes correct — the standing case is a build whose target the entry point cannot represent — but it is declared, not assumed. Both declarations live in the owning fractal's `DETAIL.md`, each with its reason. An organ consumed from outside with neither declaration is a finding that names both resolutions — promote it to a fractal, or move it to its consumers' lowest common fractal — and cites the consumer paths. The same declaration covers a fractal's internals: a consumer barred from the entry point by something the boundary cannot represent declares the exemption rather than widening the contract; undeclared, it stays a violation.
- **A verification file lives inside what it verifies; within that owner it is not judged by this rule, and its references do not close a cycle.** Checking an internal unit means reaching it; the alternative exports internals for tests alone. One that reaches into another fractal's internals is misplaced, not exempt. Which files are verification comes from the adapter, not from a filename pattern.

## 6. The graph is acyclic and depth is a toll

Dependency edges point from consumers to entry points and form a DAG; a reported cycle carries its source files and resolved dependency evidence. A node stays within the configured structural depth, measured from the scanned project root over classified nodes. A pure-function node depends on no fractal or hybrid — where isolation cannot be proven, reclassify the node or pass its dependencies in as inputs. Where evidence is missing the answer is `indeterminate` — and `indeterminate` and `unsupported` are never converted to a pass.

---

**This rule is working if:** a directory's type can be predicted from its files before any tool runs, listing a fractal's level shows its child modules apart from its compartments, a unit's reach can be read from its path, and every organ used from outside carries a declaration that says why. **This rule is wrong for you if:** the repository has not adopted FCA — then a scan names the fractals that are missing, and nothing here binds until you decide to add them.
