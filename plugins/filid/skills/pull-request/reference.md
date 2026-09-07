# pull-request — Reference

## §1 Abort and publication messages

Emit these verbatim; the pipeline matches on the first line.

**Stage 0 — dirty source worktree**

```text
Pull request aborted: the worktree has uncommitted source changes.
Commit or stash them first. Only INTENT.md / DETAIL.md and declared generated
paths may be dirty — Stage 1 is the documents' sole committer, and generated
paths are never staged here.
```

**Stage 0 — dirty documents with `--skip-enrich`**

```text
Pull request aborted: INTENT.md / DETAIL.md are dirty and --skip-enrich was
passed, so nothing will commit them. Drop --skip-enrich or commit the documents
yourself.
```

**Stage 0 — no commits ahead of base**

```text
Pull request aborted: the branch has no commits ahead of <BASE_REF>.
```

**Stage 0/2 — base unresolvable**

```text
Pull request aborted: could not resolve a base ref. Pass --base explicitly.
```

**Stage 4 — unpushed branch with `--push` off**

```text
Pull request body saved: origin has no <BRANCH>, or it is behind HEAD, and
--push is off (--no-push). Push it (`git push -u origin <BRANCH>`) or re-run
with --push.
```

## §2 Scripted base resolution

Run `scripts/resolveBaseBranch.mjs --project-root <PROJECT_ROOT>` in Stage 0. Forward `--base <REF>` when supplied to bypass inference; accept a local or origin branch, not a tag or commit ID. The script reads local refs without fetching.

Use returned JSON `baseRef` for diffs and `baseBranch` for `gh --base`. Report `source`, `ahead`, `behind`, and `ambiguous` / `tiedCandidates` when present. `mergeBase` and `head` identify the compared commits. Preserve the selection throughout this run. On exit 1, report stderr and stop; never substitute another base. An ambiguous estimate can be overridden with `--base`.

## §3 PR body layout

Five open sections appear at the top, followed by four collapsed regions. The complete open area stays within 40 lines. Optional sections are omitted, including their headings or wrappers, when their inputs are absent.

| Order | Area                 | Section           | Required | When empty                                                              |
| ----- | -------------------- | ----------------- | -------- | ----------------------------------------------------------------------- |
| 1     | open                 | `## Summary`      | yes      | Keep all three bullets                                                  |
| 2     | open                 | `## Links`        | no       | Omit the section                                                        |
| 3     | open                 | `## Contract`     | yes      | `None`                                                                  |
| 4     | open                 | `## Review notes` | no       | Omit the section                                                        |
| 5     | open                 | `## Verification` | yes      | Use the unchecked fallback line                                         |
| 6     | collapsed            | `Changes`         | yes      | Keep one `None` table row                                               |
| 7     | collapsed            | `Screenshots`     | no       | Omit the region                                                         |
| 8     | collapsed            | `Work context`    | no       | Omit the region                                                         |
| 9     | collapsed internally | `## FCA Handoff`  | yes      | Written by review_state handoff in Stage 3 step 8 — never authored here |

```markdown
## Summary

- **Why** — <problem or motivation>
- **What** — <consumer-visible result>
- **Approach** — <implementation approach>

<optional fenced mermaid diagram>

<one-sentence diagram takeaway>

## Links

| Kind     | Link                                |
| -------- | ----------------------------------- |
| Issue    | [<label>](url) — <one-line summary> |
| Spec     | [<label>](url) — <one-line summary> |
| Decision | [<label>](url) — <one-line summary> |

## Contract

- `<fractal>` — <consumer-visible structural change>
- **Rollback** — <rollback path>

> [!WARNING]
> **Breaking** — <breaking consumer impact>

## Review notes

- **Start here** — <review entry point>
- **Constraints** — <assumptions and known limitations>
- **Risk** — <risk and coupled files>

## Verification

- [x] `<command or check>` — <observed result>
- [ ] <remaining check> — <reason and how to close it>

<details>
<summary><b>Changes</b> — <n> files, <k> fractals, +<a> / −<b> · base <code>&lt;BASE_BRANCH&gt;</code></summary>

| Fractal     | Kind   | What changed          |
| ----------- | ------ | --------------------- |
| `<fractal>` | <kind> | <one-sentence change> |

- Stage 1 document sync commit `<hash>` — <document change summary>.
- <n> non-FCA paths were excluded from document sync — <config declaration status>.

</details>

<details>
<summary>Screenshots</summary>

|                Before                |                After                |
| :----------------------------------: | :---------------------------------: |
| <img src="<before-url>" width="320"> | <img src="<after-url>" width="320"> |

<optional screenshot note>

</details>

<details>
<summary>Work context</summary>

- **Environment** — <runtime and base>
- **Account / data** — <non-secret account and fixture context>
- **Manual steps**
  1. <step>
- **Expected** — <expected result>

</details>

<!-- appended by review_state handoff; do not author -->
```

Rules:

- The title is English and follows the repository commit-subject convention.
- Body prose follows `[filid:lang]`. Identifiers, paths, commands, and rule IDs stay in their original form.
- Never paste a raw diff. Reference paths instead.
- Never invent a rationale that is not in the commits or the FCA documents.
- `Summary` always has `**Why**`, `**What**`, and `**Approach**` bullets. Include one mermaid diagram only when the change alters relationships; it has at most 12 nodes and 600 characters including its fence, followed by one sentence stating the point. This contract does not prescribe how to author the diagram.
- `Links`, `Review notes`, `Screenshots`, and `Work context` are optional. If one has no caller input, omit its heading or complete `<details>` region. `Contract` uses `None` when no structural row exists. Empty `Verification` uses `- [ ] No verification recorded by the author — rely on CI results and reviewer judgment.` Render that fallback in the body language (`[filid:lang]`); the English literal above is the reference wording. The required `Changes` table uses one `None` row when it has no changes.
- Keep the five open sections to at most 40 lines in total. If necessary, reduce each `Review notes` bullet to one sentence and each checked `Verification` item to its command and observed result.
- Build `Contract` only from `Changes` rows whose `Kind` is `new`, `removed`, `moved`, or `boundary`. Give each affected fractal one `` `<fractal>` — <consumer-visible change> `` bullet. Do not promote `behavior` or `test` rows. Keep `**Rollback**` and any `> [!WARNING]` breaking notice in `Contract`.
- When structural fractals exceed 10, replace their individual `Contract` bullets with one Kind-count line such as `new 3, moved 1, boundary 12`; preserve `> [!WARNING]` and `**Rollback**`.
- The only evidence for `Changes` rows is the Stage 1 `fractal_inspect` `resolve` batch's `ownerFractalPath` set and `git diff --name-status -M <BASE_REF>...HEAD`. Create one row per owner fractal, add rows established by the `removed` and `moved` rules below, and put one final `(non-FCA)` row when ownerless paths exist. That row states the path count and whether configuration declares the exclusion. Put the Stage 1 document commit and non-FCA exclusion summaries in bullets below the table.
- Derive `Kind` by first match:
  1. `removed` for `D <F>/INTENT.md`.
  2. `new` for `A <F>/INTENT.md`.
  3. `moved` for `R… <old>/INTENT.md <F>/INTENT.md`; write `<old> → <F>` in `What changed`.
  4. `boundary` for `M <F>/INTENT.md` or a changed non-document file directly under `<F>`, not in one of its subdirectories.
  5. `test` when every changed path under `<F>` matches the approximate verification predicate: a path segment is `__tests__`, `tests`, `test`, `spec`, `specs`, `e2e`, or `fixtures`, or the filename contains `.test.` or `.spec.`.
  6. `behavior` for every other row.
- The `What changed` cell of a `test` row states the spec-document / test-record case-count delta when those documents changed, and `no case-count delta` otherwise.
- Sort `removed`, `new`, `moved`, and `boundary` first in that order, then `test` and `behavior`. Within each kind, sort by changed-file count descending. Do not display file counts in table rows.
- Links, Review notes, Work context, and Verification come only from caller input, commands observed before this skill invocation, files actually present in the branch diff, and commit messages. Do not infer design decisions from code.

## §4 What this skill does not do

- It does not run `cross-review`. Chain that separately, or use `pipeline`.
- It does not infer links, decisions, or verification results. Those come from the caller's inputs and the branch, never from reading code.
- It pushes an unpushed branch — no remote counterpart, or local commits the remote lacks — before opening the PR (`--push`, on by default), and says so in the terminal output. `--no-push` turns it off: the run then ends with the body saved locally and the §1 message; `gh` is not called, because its own error (`Head sha can't be blank`) does not name the cause.
- It does not edit source code. Stage 1 touches documents only.
- It does not fix source-level findings. Cycles, boundary violations, verification caps and indeterminate evidence are recorded in the handoff for `cross-review`.
- It does not create or resolve debt records. Rejections are recorded by `resolve` in `justifications.md`.

## §5 Dirty path classification

`review_state({action: "assess"})` performs the classification. This section explains what it returns; it is not a procedure to run by hand. Reproducing it in prose was how two runs on the same tree could disagree.

The tool reads `structure.generatedPaths` from the project config and sorts every path `git status` reports into three classes — **first match wins**:

| Test, in order                                           | Class     | Meaning                    |
| -------------------------------------------------------- | --------- | -------------------------- |
| Basename is `INTENT.md` or `DETAIL.md`                   | document  | Stage 1 commits it         |
| Path matches a `generatedPaths` entry, or sits under one | generated | build output, never staged |
| Anything else                                            | source    | a real change              |

`summary.worktreeDisposition` reports what the classes add up to: `clean`, `documents-only`, `generated-only`, or `source-dirty`. `data.assessment.worktree` carries the three path lists.

What the tool guarantees:

- Patterns match segment by segment; `*` matches exactly one segment. There is no `**` and no partial-segment wildcard, so a pattern names one path shape.
- `generatedPaths` covers artifacts the build writes **and the repository tracks**. Ignored output never reaches `git status`, so it needs no entry.
- An empty list makes every non-document path source — the conservative default, not a misconfiguration to work around.
- The classification decides whether the cycle continues. It never decides what gets committed: only documents are ever staged by this skill.

## §6 Non-FCA document scope

Stage 1 narrows only the FCA document audit, never the PR change list. Send every changed path through the one `fractal_inspect` `resolve` batch, preserve changed-path order, and classify each result with the first applicable row:

| Evidence                                                                                                       | Document scope             | Action                                                                                                                                    |
| -------------------------------------------------------------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `fractal_inspect` `resolve` returns `resolved: true`                                                           | FCA-owned                  | Keep `result.summary.ownerFractalPath`; a target under a config-excluded directory name is still FCA-owned through its enclosing fractal. |
| `resolved: false`, every diagnostic is `context-target-unresolved`, and `git cat-file -e HEAD:<path>` succeeds | existing ownerless non-FCA | Report the path and ownerless evidence; use a matching `structure.additionalExcludedDirectories` segment as the config-declared reason.   |
| The target is absent from `HEAD`, including a deleted or renamed source                                        | unresolved                 | Resolve the nearest ancestor directory present in `HEAD`; when none resolves, record `unresolved-path` (§7) and continue.                 |
| Any other failed diagnostic                                                                                    | unresolved                 | Record the diagnostic verbatim as `unresolved-path` (§7) and continue.                                                                    |

`additionalExcludedDirectories` entries are directory names, not paths or globs. Compare complete project-relative directory segments; never match the basename or a partial segment. The config match is a reason, not an ownership override, and is consulted only after `resolved: false`. Config-declared and structural ownerless paths are listed in terminal progress and summarized by count in the bullet list under the `Changes` table. They remain in the `Changes` table as the `(non-FCA)` row because non-FCA is a document-ownership verdict, not a request to hide the change.

When every changed path is non-FCA, Stage 1 completes the single `fractal_inspect` `resolve` batch, makes no enrich-docs call, and reports `Document sync: no-change` (`skipped` with `--skip-enrich`). A failed item is never converted to non-FCA merely because ignoring it would let publication continue.

## §7 Handoff block

`review_state handoff` generates this section from the same snapshot and candidate selection `prepare` uses; the skill supplies only `documentSync`, `repaired`, and synthetic entries. The class table below documents `classifyHandoffFinding`; the code is canonical.

Certainty takes precedence: every finding with `certainty: indeterminate` or `unsupported` belongs to `indeterminate`. When certainty is absent and the message contains `indeterminate`, that finding belongs to the same class too; current `test-record-case-cap` findings can have this shape. Otherwise absent certainty remains `"certainty":"unstated"` in the machine block and classification proceeds by rule.

`repaired` is a seed count, not a class.

| Class             | Evidence                                                                                                                                                                                                                  | Treatment                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `needs-rework`    | A document reverted by enrich-docs                                                                                                                                                                                        | Record it                                              |
| `needs-rework`    | `stale-path` that does not name a `structure.generatedPaths` token                                                                                                                                                        | Record it                                              |
| `config-decision` | `stale-path` naming a `structure.generatedPaths` token; `organ-no-intentmd`; a Boundary Exemption with an empty Reason (`missing-field`)                                                                                  | Record for a human or configuration decision           |
| `code-change`     | `circular-dependency`, `external-import-boundary`, `pure-function-isolation`, `max-depth`, `zero-peer-file`, `module-entry-point`, `entry-point-surface`; `test-record-case-cap` and `spec-*` with `exact` certainty      | Record for review                                      |
| `indeterminate`   | Any finding with `indeterminate` or `unsupported` certainty; scan-level diagnostics; `Verification evidence is indeterminate.`                                                                                            | Record the evidence gap                                |
| `unresolved-path` | A Stage 1 step 2 resolution failure that cannot become non-FCA                                                                                                                                                            | Record the path and diagnostic                         |
| `document-sync`   | Enrich-docs cancellation (`declined`), tool failure or missing ending marker (`failed`), `--skip-enrich` (`skipped`), resolve-batch or document-commit failure; the tool's failed validation (`ruleId: handoff-validate`) | Record the diagnostic verbatim and continue to Stage 2 |

Default classification for findings outside the table: a remaining `documents` scope finding is `needs-rework`; a `verification` scope finding with no certainty and no `indeterminate` in its message is `code-change`, reflecting an actual cap violation. Any other unknown `ruleId` is `code-change` with `unclassified:` prefixed to its note.

Keep scope-uncertain findings: a project-wide rule with `path: "."` whose message names no owner path becomes `indeterminate`, with `scope-uncertain:` prefixed to its note. Do not drop it. An `external-import-boundary` message may contain only a raw specifier; do not interpret that specifier as a project path.

Rules for the body format:

- **Always present.** The tool always writes the section; zero findings render `None` and `"recorded":[]`.
- **Machine block.** `scope/reviewHandoffSeedSchema.ts` defines the machine fields, entry fields, enum values, and bounds shared by `review_state handoff` and `review_state prepare`. Changing the block requires changing that schema and both the writer and reader.
- **Synthetic entries.** Caller `entries` use `{ class, ruleId, path, note, severity?, certainty? }`. Omitted `severity` and `certainty` default to `warning` and `unstated`. The tool bounds `note` to 120 characters and `ruleId` to 80.
- **Language.** Body prose follows `[filid:lang]`; rule IDs, paths, and certainty values remain unchanged. This reference stays in English.

Normal handoff — document sync committed three repairs, with two findings carried to review:

```markdown
## FCA Handoff

<details>
<summary>FCA findings carried to review — 2 recorded, 3 repaired in Stage 1</summary>

Counts: 1 code-change, 0 config-decision, 1 indeterminate, 0 needs-rework, 0 unresolved-path, 0 document-sync.

| Class         | Rule                 | Path                                                                     | Certainty     | Note                                                                                        |
| ------------- | -------------------- | ------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------------------------------------- |
| code-change   | circular-dependency  | plugins/filid/src                                                        | exact         | plugins/filid/src → plugins/filid/src/mcp/server → plugins/filid/src                        |
| indeterminate | test-record-case-cap | plugins/filid/src/**tests**/unit/mcp/reviewState/readReviewState.test.ts | indeterminate | parameterized case at offset 6203 uses a dynamic table; case count &gt; 32 is indeterminate |

</details>

<!-- filid:handoff v1
{"schema":1,"snapshotHash":"9e31fcaf08d71b924d67f4081e2d8fb0c491f304abeca20dfc1711bc24a14e52","scope":["plugins/filid/src"],"documentSync":"committed","repaired":3,"recorded":[{"class":"code-change","ruleId":"circular-dependency","path":"plugins/filid/src","severity":"error","certainty":"exact","note":"plugins/filid/src → plugins/filid/src/mcp/server → plugins/filid/src"},{"class":"indeterminate","ruleId":"test-record-case-cap","path":"plugins/filid/src/__tests__/unit/mcp/reviewState/readReviewState.test.ts","severity":"warning","certainty":"indeterminate","note":"parameterized case at offset 6203 uses a dynamic table; case count \u003e 32 is indeterminate"}],"truncated":0}
-->
```

Failed final validation — the artifact could not be read, so publication carries one synthetic finding and no snapshot hash:

```markdown
## FCA Handoff

<details>
<summary>FCA findings carried to review — 1 recorded, 0 repaired in Stage 1</summary>

Counts: 0 code-change, 0 config-decision, 0 indeterminate, 0 needs-rework, 0 unresolved-path, 1 document-sync.

| Class         | Rule             | Path | Certainty | Note                                                                           |
| ------------- | ---------------- | ---- | --------- | ------------------------------------------------------------------------------ |
| document-sync | handoff-validate | .    | unstated  | artifact-read-failed: cannot read /tmp/filid-validate.json (read count &lt; 1) |

</details>

<!-- filid:handoff v1
{"schema":1,"snapshotHash":null,"scope":["plugins/filid/src"],"documentSync":"failed","repaired":0,"recorded":[{"class":"document-sync","ruleId":"handoff-validate","path":".","severity":"warning","certainty":"unstated","note":"artifact-read-failed: cannot read /tmp/filid-validate.json (read count < 1)"}],"truncated":0}
-->
```

`cross-review` Step 1 saves the PR body to a file and passes `changeContextPath`; `review_state prepare` parses the machine block and excerpts the top template sections.

## §8 Caller inputs

URL-shaped values use repeatable options; prose comes from one notes file.

| Option                     | Repeatable | Destination                   |
| -------------------------- | ---------- | ----------------------------- |
| `--issue <url\|#n>`        | yes        | `Links` / `Issue`             |
| `--spec <url>`             | yes        | `Links` / `Spec`              |
| `--decision <url\|path>`   | yes        | `Links` / `Decision`          |
| `--screenshot <url\|path>` | yes        | `Screenshots`                 |
| `--focus <text>`           | no         | `Review notes` / `Start here` |
| `--notes <path>`           | no         | Recognized prose sections     |

Rules:

- A link cell is `[<label>](<url>) — <one-line summary>`. Take the summary only from caller text in the form `<url-or-path> -- <summary>`; without that text, render only the link.
- Only an explicit `closes:` prefix on an `--issue` value renders a GitHub closing keyword. A plain URL or `#n` never implies `Closes`.
- For a repository-relative `--decision` path, require `git cat-file -e HEAD:<path>`. If it exists, obtain the repository URL with `gh repo view --json url -q .url` and render `https://<host>/<owner>/<repo>/blob/<BRANCH>/<path>`. If validation or rendering fails, discard that item and report it in the terminal; do not abort.
- A local `--screenshot` path is uploaded with `gh image <path>`, and the emitted Markdown reference supplies the body URL. If the extension is unavailable or upload fails, retain the local path marked `(not uploaded)` and report the failure in the terminal.
- The notes file recognizes only the fixed English H2 headings `Summary`, `Review notes`, `Verification`, and `Work context`. Match them case-insensitively after trimming surrounding whitespace. `Summary` replaces the content of the `**Approach**` bullet; insert the other recognized bodies unchanged as the complete section contents. Concatenate duplicate recognized headings in file order.
- Ignore text before the first H2 and all unrecognized headings, and report the ignored heading names or preamble in the terminal. A missing notes file is reported and contributes no notes content; it does not abort.
- Links, Review notes, Verification, and Work context are never inferred from code. Their evidence is caller input and commands whose results the caller observed before invoking the skill. Design decisions are never inferred by reading code.
- Work context never contains secrets, tokens, or Claude session identifiers.
