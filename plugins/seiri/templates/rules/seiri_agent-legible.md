# Agent-Legible Code

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Code is read by agents and newcomers who hold no tribal memory: what the
file does not show, they will guess. This rule makes the invisible parts
visible at the point where they bite.
This rule rests on properties every codebase has: code lives in files with
names and paths, and symbols are defined and referenced.

**Tradeoff:** a few lines of signposting, and sometimes a plainer
construction where a cleverer one would also work.
**Applies when:** the change is intended to land in version control.

## 1. State the invisible wiring

**When behavior is bound by position, name, or registration — write down
where the binding lives.**

- Some code has no visible call site: the framework invokes it because of
  its file path, its name pattern, an annotation, or a registration made
  elsewhere. A reader holding only this file cannot predict when it runs.
- At the entry of such a file (or its module doc), state the mechanism in
  one line: `loaded by <mechanism>; <path/name/annotation> determines <what>`.
- Framework conventions stay — this rule asks you to label them, not to
  fight them.

Ask yourself: "Could a reader with only this file and its imports predict
when this code runs?"

## 2. Give every repeated block a unique anchor

**In repetitive structures, order is not an address.**

- Lists of near-identical entries (config blocks, case tables, parallel
  handlers, fixtures) invite edits that land on the wrong instance. Each
  instance needs a distinct handle: a name, a key, or an adjacent marker
  that appears nowhere else.
- When several near-identical copies of a structure exist across the
  repository (source vs. generated, template vs. instance), make the
  editable one identifiable — state which copy is canonical.

Ask yourself: "If I asked someone to edit the third block, could they
pick the wrong one?"

## 3. Defuse name traps

**When a name will mislead, fix the name — or post a warning where the
misleading happens.**

- Traps: an entry point that is not the conventional file; several files
  sharing one basename in sibling directories; a module whose name
  suggests a role it does not have; aliases that diverge from on-disk
  paths.
- Prefer renaming toward the convention. When renaming is out of scope,
  one line at the point of confusion: `entry point is <X>, not <Y>`.

Ask yourself: "What would someone reasonably assume from this name — and
is that assumption true?"

## 4. Prefer the direct reference

**When a direct call and an indirect mechanism are equally capable,
choose direct.**

- Every hop — a re-export chain, an event bus, a registry lookup, a
  string-keyed dispatch, deep inheritance — hides the reader's next step.
  Indirection is a cost you pay for a capability; when the capability is
  not needed, do not pay.
- Indirection demanded by the architecture or the framework is not yours
  to remove — label it (rule 1) and move on.

Ask yourself: "Can a reader follow this reference with plain text search?"

## 5. Keep one unit graspable in one sitting

**A unit should be understandable alone: purpose from its name and head,
dependencies from its imports, effect from its exports.**

- When understanding one file requires holding several others open at
  once, the boundary is drawn wrong — split the unit, or localize what it
  depends on.
- Readers — human and agent — reason best about what fits in view at
  once. A file that keeps demanding context beyond itself is a boundary
  smell, not a reading-skill problem.

Ask yourself: "Can I state what this file does without opening a second
file?"

---

**This rule is working if:** edits land on the intended instance on the
first attempt; a new file's run-conditions can be stated from the file
alone; plain text search finds a feature's wiring.
**This rule is wrong for you if:** the indirection you want to remove IS
the framework — label framework conventions and leave them standing.
