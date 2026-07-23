# Public Contract

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

What a module exports is a promise to every present and future consumer.
This rule keeps that promise small, named, and enumerable.
This rule rests on a property every codebase with a module system has: a
distinction exists between what is public and what is internal.

**Tradeoff:** occasionally you will export one symbol twice on purpose
(once for use, once for stated intent) instead of exporting everything once.
**Applies when:** the language or module system in use has an export or
visibility mechanism.

## 1. Export only what has a consumer

**An export with no consumer carries a stated intent — or gets removed.**

- Exporting is publication, not filing. Every public symbol widens the
  surface that must stay compatible.
- A symbol nothing consumes is either intended API (state it: a doc line,
  a public-surface list — whatever this repository uses) or leftover.
  Remove leftover your change added or orphaned; leave a pre-existing one
  for a deliberate cleanup (seiri_reuse-first §3). Usage is checkable by
  tools; intent must be written by you — exported symbols cannot enumerate
  their future callers.

Ask yourself: "Who consumes this — and if no one yet, where did I say so?"

## 2. Name every re-export

**A contract you cannot enumerate is not a contract.**

- Wildcard re-exports hide the surface three ways: a new symbol added to
  an internal file silently widens the public contract; duplicate names
  across re-exported files drop silently; and text tools lose the symbol
  list at the boundary.
- Entry points list what they export, by name. The list is the contract,
  and diffs to the list are visible in review.

Ask yourself: "Can I read the public surface without resolving a wildcard?"

## 3. Entry points declare, internals implement

**The set of symbols reachable from the entry point IS the public
contract; everything behind it is free to change.**

- An entry point contains declarations of the surface — re-exports and
  wiring — not implementation. Implementation lives in internal files
  where it can be reshaped without touching the contract.
- Consumers outside the module hold only entry-point symbols. What shape
  the entry point takes and where module boundaries lie is the
  repository's (or its architecture tooling's) decision — follow it.

Ask yourself: "If I renamed every internal file, would any consumer break?"

## 4. Framework-invoked files are entry points too

**A file the framework calls by convention is public surface, even though
no import names it.**

- Routes, pages, handlers, plugin manifests: their exported shape is a
  contract with the framework. Treat changes to that shape as contract
  changes, and label the convention that invokes them (see
  seiri_agent-legible §1).

Ask yourself: "What breaks at runtime if I change this export's shape —
and would any import have warned me?"

---

**This rule is working if:** the public surface can be enumerated by
reading entry points; removing an internal symbol breaks no consumer;
review diffs show contract changes as changed lines in an export list.
**This rule is wrong for you if:** the code is a single-file script or
notebook with no module boundary — there is no contract to keep small.
