# Context Efficiency Rules

Context is the scarcest resource in an agent session: performance degrades
as it fills, and every wasted read crowds out instructions already given.
These rules keep file reads and command output proportional to the task.

**Tradeoff:** These rules bias toward fewer, more deliberate reads. When
genuinely disoriented, one broad read beats three wrong guesses.

## 1. Generated Artifacts Are Search-Only

**Build output is not source. Fix generators, not their output.**

- Directories like `dist/`, `build/`, `out/`, `coverage/`, `.next/`,
  `node_modules/`, lockfiles, and generated clients: search them to trace
  a symbol, but do not read them wholesale, and never edit them.
- Stale build output read as source is a classic wrong-file edit: the
  "bug" you found may already be fixed upstream, and an edit made there
  disappears on the next build.
- When a generated file is wrong, the deliverable is a change to its
  generator or source template.

Ask yourself: "Would this file survive a clean build?"

## 2. Capture Once, Read From the File

**Re-running a command to re-read its output pays twice.**

- Never re-run the same test suite or long command with different grep
  filters. Capture the output to a file once, then search and re-read
  from that file.
- Long or repeated diagnostics (build logs, dev-server output) belong in
  a file you can `grep` and `tail` — not in scrollback that is gone by
  the next step.

Ask yourself: "Did I already have this output and throw it away?"

## 3. Do Not Re-Read the Unchanged

**A file you read and did not change is still in your context.**

- Never re-read the same file section without intervening code changes.
- Read the part of the file the task needs; a targeted range read plus a
  follow-up beats loading whole files by default.
- Before a broad exploration, state what you are looking for; stop when
  you find it.

Ask yourself: "What new fact will this read give me that the last one didn't?"

---

**These rules are working if:** generated directories never appear in your
edits, long outputs are captured to files and quoted from them, and no
file section is read twice without a change in between.
