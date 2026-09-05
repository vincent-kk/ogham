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

**Stage 2 — base unresolvable**

```text
Pull request aborted: could not resolve a base ref. Pass --base explicitly.
```

**Stage 4 — unpushed branch with `--push` off**

```text
Pull request body saved: origin has no <BRANCH>, or it is behind HEAD, and
--push is off (--no-push). Push it (`git push -u origin <BRANCH>`) or re-run
with --push.
```

## §2 Base resolution order

1. `--base REF` when supplied.
2. The remote HEAD default branch (`git symbolic-ref refs/remotes/origin/HEAD`).
3. `origin/main`.
4. `origin/master`.

Each candidate is verified with `git rev-parse --verify` before use. The first one that resolves wins. Nothing further is guessed.

## §3 PR body layout

Four sections, always present, in this order. An empty section carries the single word `None`; FCA Handoff also retains its machine block as defined in §7.

```markdown
## Architecture

<FCA-visible changes: fractals added, moved, or reclassified; INTENT.md /
DETAIL.md commits made by Stage 1; entry-point or boundary changes.>

## Code

<Behavioral changes grouped by owning fractal, one line each.>

## Test

<spec-document and test-record changes, with the case-count delta when it
moved.>

## FCA Handoff

<see §7 — the collapsed findings table and the machine block, or `None`>
```

Rules:

- The title is English and follows the repository commit-subject convention.
- Body prose follows `[filid:lang]`. Identifiers, paths, commands, and rule IDs stay in their original form.
- Never paste a raw diff. Reference paths instead.
- Never invent a rationale that is not in the commits or the FCA documents.

## §4 What this skill does not do

- It does not run `cross-review`. Chain that separately, or use `pipeline`.
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
| The target is absent from `HEAD`, including a deleted or renamed source                                        | unresolved                 | Resolve the nearest ancestor directory present in `HEAD`; when none resolves, record `unresolved-path` (§7) and continue.                  |
| Any other failed diagnostic                                                                                    | unresolved                 | Record the diagnostic verbatim as `unresolved-path` (§7) and continue.                                                                     |

`additionalExcludedDirectories` entries are directory names, not paths or globs. Compare complete project-relative directory segments; never match the basename or a partial segment. The config match is a reason, not an ownership override, and is consulted only after `resolved: false`. Config-declared and structural ownerless paths are listed in terminal progress and summarized by count in the PR Architecture section. They remain in the Code/Test analysis because non-FCA is a document-ownership verdict, not a request to hide the change.

When every changed path is non-FCA, Stage 1 completes the single `fractal_inspect` `resolve` batch, makes no enrich-docs call, and reports `Document sync: no-change` (`skipped` with `--skip-enrich`). A failed item is never converted to non-FCA merely because ignoring it would let publication continue.

## §7 Handoff block

The handoff carries the findings left after Stage 1's document work and its final project-root validation. Filter the final violations to paths inside an owner fractal, plus project-wide rules (`circular-dependency`, `external-import-boundary`, and verification rules) whose `message` names a path inside one. `RuleViolation` has no evidence field: its message is the only path evidence for those project-wide rules.

Apply certainty first: every finding with `certainty: indeterminate` or `unsupported` belongs to `indeterminate`. When certainty is absent and the message contains `indeterminate`, use that class too; current `test-record-case-cap` findings can have this shape. Otherwise retain absent certainty as `"certainty":"unstated"` in the machine block and classify by rule.

| Class | Evidence | Treatment |
| --- | --- | --- |
| `repaired` | The enrich-docs report's `Repaired: n` | Include repairs in the Stage 1 document commit; report a count only, with no individual table or machine rows |
| `needs-rework` | A document reverted by enrich-docs | Record it |
| `config-decision` | `stale-path` naming a `structure.generatedPaths` token; `organ-no-intentmd`; a Boundary Exemption with an empty Reason (`missing-field`) | Record for a human or configuration decision |
| `code-change` | `circular-dependency`, `external-import-boundary`, `pure-function-isolation`, `max-depth`, `zero-peer-file`, `module-entry-point`, `entry-point-surface`; `test-record-case-cap` and `spec-*` with `exact` certainty | Record for review |
| `indeterminate` | Any finding with `indeterminate` or `unsupported` certainty; scan-level diagnostics; `Verification evidence is indeterminate.` | Record the evidence gap |
| `unresolved-path` | A Stage 1 step 2 resolution failure that cannot become non-FCA | Record the path and diagnostic |
| `document-sync` | Enrich-docs cancellation (`declined`), tool failure or missing ending marker (`failed`), `--skip-enrich` (`skipped`), resolve-batch or document-commit failure; final validation or artifact-read failure (`ruleId: handoff-validate`) | Record the diagnostic verbatim and continue to Stage 2 |

Default classification for findings outside the table: a remaining `documents` scope finding is `needs-rework`; a `verification` scope finding with no certainty and no `indeterminate` in its message is `code-change`, reflecting an actual cap violation. Any other unknown `ruleId` is `code-change` with `unclassified:` prefixed to its note.

Keep scope-uncertain findings: a project-wide rule with `path: "."` whose message names no owner path becomes `indeterminate`, with `scope-uncertain:` prefixed to its note. Do not drop it. An `external-import-boundary` message may contain only a raw specifier; do not interpret that specifier as a project path.

Rules for the body format:

- **Always present.** Keep `## FCA Handoff` and the machine block in every body. With zero findings, replace `<details>` with `None` and keep `"recorded":[]`. Otherwise use the summary, class counts, table, and machine block shown below. Counts describe the complete handoff, including entries omitted from the machine block; repaired documents contribute only to `repaired`.
- **Budget.** Keep the whole PR body within 8000 characters, the consumer's `REVIEW_CHANGE_CONTEXT_LIMIT`. Measure exactly as `readChangeContext.ts` does: normalize `\r\n?` to `\n`, remove Cc control characters except LF and TAB, then use JavaScript string `.length`. Apply the following procedure in order:
  1. Apply the field caps below, then serialize and measure the required skeleton: all four section headings, the handoff summary line, class-count line, and required JSON with `recorded: []`. Fold `scope` by count and serialized length: merge the deepest paths into their least common ancestor until there are at most 20 owner paths and the skeleton plus the 1500-character handoff reserve plus the three minimal section count sentences fits within 8000 characters. Re-serialize after each fold. Boundary example: 20 scope paths of 400 characters each must still fold when that total exceeds 8000 characters, even though the count cap is already met.
  2. Reserve 1500 characters for the handoff from the space left after the skeleton. Architecture, Code, and Test use the remaining space. If those sections exceed it, collapse each to one summary line per owner fractal; if still too large, retain only owner and changed-file counts. Reduce enumeration while preserving the meaning.
  3. Allocate the space left to machine entries first (at most 40), then table rows (at most 20). The machine block is the canonical carrier; the table is a display projection of entries already in `recorded`, so table rows are always a subset of `recorded`. Apply the collapse rule below to those entries before adding table rows. Before adding each entry or row, measure the resulting serialized body and include it only when it fits.
  4. Set `truncated` to the number of findings omitted from the machine block alone. Table collapse and omission are shown by visible counts and do not increase `truncated`.
  5. Re-measure the complete body and read the JSON back with `JSON.parse`. If residual overflow remains, remove trailing table rows first, then trailing machine entries, updating the omission line and `truncated` respectively. If overflow still remains, continue the same common-ancestor scope folding regardless of whether prose remains until the complete body fits. Preserve the four headings and valid required JSON throughout; finish only with a body of at most 8000 characters.
- **Table cap and collapse.** Sort by class in this order: `code-change`, `config-decision`, `indeterminate`, `needs-rework`, `unresolved-path`, `document-sync`. The table has at most 20 data rows, derived only from `recorded`. More than five recorded findings with the same class and rule collapse into one row: Path is their longest common path prefix, and Note gives the count. Summarize any further omitted table rows drawn from `recorded` below the table as `… and <k> more (see machine block)`. Displayed, collapsed, and omitted table rows describe only findings present in `recorded`; findings absent from `recorded` may be mentioned only when `truncated > 0`, with a separate machine-omission count.
- **Machine block.** Use one line of JSON with `schema: 1`, `snapshotHash`, `scope`, `documentSync`, `repaired`, `recorded`, and `truncated`. Each `recorded` entry has exactly six fields: `class`, `ruleId`, `path`, `severity`, `certainty`, and `note`. Retain findings individually even when the table collapses them. `severity` is `error`, `warning`, or `info`; certainty is `exact`, `indeterminate`, `unsupported`, or `unstated`. `documentSync` is `committed`, `no-change`, `skipped`, `declined`, or `failed`; both counts are nonnegative integers. `review_state prepare` reads this contract through its Zod schema, so adding or renaming fields requires changing both writer and reader.
- **Field caps.** `scope` has at most 20 entries; each normalized scope path and finding `path` is 1–400 characters. `snapshotHash` is 1–128 characters or `null`; `ruleId` is 1–80 characters; `note` is at most 120 characters; `recorded` has at most 40 entries. Use the first 128 hash characters and first 80 rule-ID characters if needed. Never shorten a path with an ellipsis. For a path over 400 characters, replace it with its nearest ancestor directory path of at most 400 characters; keep a real project path so the reader's segment-prefix matching still works. If even the first segment exceeds 400 characters, use `.`. A note is the message's first 120 characters, including any classification prefix within that cap. Preserve diagnostics verbatim in Stage 1's report; the body carries the bounded prefix.
- **Delimiters and JSON escaping.** The opening marker shown below and closing `-->` each occupy their own line, with valid JSON on the single line between them. After `JSON.stringify`, replace every `<` in the serialized string with the JSON unicode escape `\u003c` and every `>` with `\u003e`; `JSON.parse` restores the original characters, and since `-->` requires a literal `>`, the HTML comment can never terminate early. Preserve the original path and identifier values apart from the stated caps; `JSON.parse` reads the values back.
- **Table-cell escaping.** For display, replace `|` with `\|`, replace each newline with one space, and render `<`, `>`, and `&` as `&lt;`, `&gt;`, and `&amp;`. Apply the 120-character display-cell cap before escaping; the machine block retains its own field caps.
- **Paths.** Normalize every path relative to `PROJECT_ROOT`, remove leading `./`, and use `/` separators; the project root is `.`. Use segment-prefix comparisons for owner filtering and grouping, before shortening paths for serialization.
- **Synthetic entries.** Tool failures, `--skip-enrich`, approval refusal, and final-validation failure use `ruleId: document-sync` or `handoff-validate`, `severity: warning`, `certainty: unstated`, and `path: "."`. Their note starts with the diagnostic code and message prefix; the final-validation failure example below shows `handoff-validate`. Set `snapshotHash` to `null` when failed final validation leaves it unknown.
- **Language.** Body prose follows `[filid:lang]`; rule IDs, paths, and certainty values remain unchanged. This reference stays in English.

Normal handoff — document sync committed three repairs, with two findings carried to review:

```markdown
## FCA Handoff

<details>
<summary>FCA findings carried to review — 2 recorded, 3 repaired in Stage 1</summary>

Counts: 1 code-change, 0 config-decision, 1 indeterminate, 0 needs-rework, 0 unresolved-path, 0 document-sync.

| Class | Rule | Path | Certainty | Note |
| --- | --- | --- | --- | --- |
| code-change | circular-dependency | plugins/filid/src | exact | plugins/filid/src → plugins/filid/src/mcp/server → plugins/filid/src |
| indeterminate | test-record-case-cap | plugins/filid/src/__tests__/unit/mcp/reviewState/readReviewState.test.ts | indeterminate | parameterized case at offset 6203 uses a dynamic table; case count &gt; 32 is indeterminate |

</details>

<!-- filid:handoff v1
{"schema":1,"snapshotHash":"9e31fcaf08d71b924d67f4081e2d8fb0c491f304abeca20dfc1711bc24a14e52","scope":["plugins/filid/src"],"documentSync":"committed","repaired":3,"recorded":[{"class":"code-change","ruleId":"circular-dependency","path":"plugins/filid/src","severity":"error","certainty":"exact","note":"plugins/filid/src → plugins/filid/src/mcp/server → plugins/filid/src"},{"class":"indeterminate","ruleId":"test-record-case-cap","path":"plugins/filid/src/__tests__/unit/mcp/reviewState/readReviewState.test.ts","severity":"warning","certainty":"indeterminate","note":"parameterized case at offset 6203 uses a dynamic table; case count > 32 is indeterminate"}],"truncated":0}
-->
```

Failed final validation — the artifact could not be read, so publication carries one synthetic finding and no snapshot hash:

```markdown
## FCA Handoff

<details>
<summary>FCA findings carried to review — 1 recorded, 0 repaired in Stage 1</summary>

Counts: 0 code-change, 0 config-decision, 0 indeterminate, 0 needs-rework, 0 unresolved-path, 1 document-sync.

| Class | Rule | Path | Certainty | Note |
| --- | --- | --- | --- | --- |
| document-sync | handoff-validate | . | unstated | artifact-read-failed: cannot read /tmp/filid-validate.json (read count &lt; 1) |

</details>

<!-- filid:handoff v1
{"schema":1,"snapshotHash":null,"scope":["plugins/filid/src"],"documentSync":"failed","repaired":0,"recorded":[{"class":"document-sync","ruleId":"handoff-validate","path":".","severity":"warning","certainty":"unstated","note":"artifact-read-failed: cannot read /tmp/filid-validate.json (read count < 1)"}],"truncated":0}
-->
```

`cross-review` Step 1 reads the PR body into `changeContext`; `review_state prepare` parses the machine block into the brief's `## FCA Handoff` section, and the visible table reaches reviewers as untrusted change context.
