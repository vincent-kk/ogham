# Code Placement

> **Precedence**: repository instructions (CLAUDE.md, project rules) > repository conventions > this rule > filid defaults — the higher source wins. Where a unit sits decides who may reach it: placement is a boundary decision, not a filing decision. Applies when the repository has adopted FCA and you are adding a unit or moving one; prefer the move at a natural seam, not mid-task.

## 1. A unit sits with the contract it implements; shared code sits at its users' lowest common fractal

A unit belongs to the fractal whose contract it implements. Only a unit serving the implementations of two or more fractals is shared: compute the lowest common fractal of the owners that use it and place the unit under it — their common ancestor is the address; anything higher is a guess. Count the consumers that use the unit: code that merely constructs it and hands it on is wiring, and counting wiring pulls everything up to the composition root. A unit with one using owner is an organ of that owner — one user is not shared code. A unit with a contract of its own, published or not, becomes a child fractal instead, with its intent, detail and entry-point artifacts.

## 2. An organ cannot be a lowest common ancestor

An organ has no entry point, so it cannot own a shared boundary. When the computed ancestor is an organ, walk up to the nearest enclosing fractal and place the unit there.

## 3. No evidence for a name means a decision is required, not invented

`shared` and `common` are names that can hold anything. A conventional compartment name — `utils`, `helpers`, `types` and their kin — states a role and needs no evidence; the topic name inside it does. When no meaningful organ name is supported by the evidence, the plan sets `requiresDecision: true` and stops for a human — do not invent a grab-bag name to let the plan proceed.

## 4. Planning is read-only; the postcondition demands the exact target

A functionally working but different result is a failed restructure. The restructure tool plans and validates — a plan reports normalized absolute source and target paths, basis, consumers, the computed ancestor, required artifacts, import rewrites and decision reasons, writing only an ephemeral plan artifact; a precondition checks the snapshot hash immediately before execution; a postcondition checks the exact target, the source's absence, the node type, documents, entry point, import boundary, required rewrites and the acyclic graph — and an external actor performs the change.

## 5. The document changes before the code does

Contracts lead; implementations follow: before changing a fractal, update DETAIL, and update INTENT only when its public boundary changes. Run Filid scans and validations once at the pull-request or merge-track seam, after implementation and accepted review fixes — earlier only when explicitly requested; ordinary development checks and edits never trigger them. At the seam, record warnings as findings and note any deviation from the plan.

---

**This rule is working if:** every unit sits in the fractal whose contract it implements, shared units sit at an ancestor you can derive from their users, and DETAIL diffs precede the implementation diffs they describe. **This rule is wrong for you if:** the unit has exactly one user and always will — then it belongs beside that user, and none of this applies.
