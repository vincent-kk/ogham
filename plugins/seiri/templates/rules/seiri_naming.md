# Naming

> **Precedence**: repository instructions (CLAUDE.md, project rules) >
> repository conventions > this rule > seiri defaults. On conflict, the
> higher source wins and this rule yields.

Names are the primary index of a codebase: they are what search finds,
what imports show, and what readers guess by. This rule makes names
findable and honest.
This rule rests on properties every codebase has: files and symbols have
names, and an existing style is already present — whatever it is.

**Tradeoff:** you will sometimes write a name you find uglier than your
own preference, because the neighbors already write it that way.
**Applies when:** the change is intended to land in version control.

## 1. Mirror the siblings

**Before naming anything, read the names around it.**

- Match the case style, the grammar (verb-first or noun-first), the
  suffix conventions, and the singular/plural habits of sibling files and
  symbols of the same kind.
- No siblings to mirror? Use the idiomatic form of the language or
  framework in use.
- A migration in progress is the one exception: follow the declared
  target style, not the majority.

Ask yourself: "What style do my neighbors already use?"

## 2. A name states one concrete responsibility

**A reader should predict the content from the name alone.**

- Name by what the unit does or holds, not by when it was added or who
  owns it.
- If an honest name needs "and", the unit is two things (see
  seiri_reuse-first §5). If the honest name is vague, the responsibility
  is vague — fix the unit, not the thesaurus.

Ask yourself: "Reading only this name, what would I expect inside — and
is that what's inside?"

## 3. No grab-bags

**Names that can hold anything end up holding everything.**

- Avoid `common`, `misc`, `util2`, `temp`, `new`, `stuff`, `extra` and
  their relatives: they defeat search, accumulate unrelated content, and
  never get cleaned up.
- Small collections still deserve domain names. Three helpers for date
  math are `date-math`, not `helpers2`.

Ask yourself: "Could a stranger guess what does NOT belong in this file?"

## 4. Derived names follow their source

**A file that exists because of another carries that other's base name.**

- Tests, specs, stories, fixtures, and generated companions are named
  after what they verify or accompany, in this repository's own
  convention for that kind of file.
- When the source renames, its derived files rename with it — a derived
  file whose base name no longer matches anything is a name trap (see
  seiri_agent-legible §3).

Ask yourself: "From this file's name, can I find the file it serves?"

---

**This rule is working if:** you can locate a feature by guessing its
name; new files look native to their directory; a rename never leaves
orphaned companions behind.
**This rule is wrong for you if:** a generator names these files — then
the generator's convention IS the sibling convention; configure the
generator, don't fight its output.
