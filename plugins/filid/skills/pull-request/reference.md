# pull-request — Reference

## §1 Abort and block messages

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

**Stage 1 — document sync failed**

```text
BLOCKED: FCA document sync failed. The PR is the last point where INTENT.md and
DETAIL.md currency is enforced, so PR creation stops here.
Fix the reported documents, or re-run with --skip-enrich to record an explicit
exception.
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

Three sections, always present, in this order. An empty section carries the single word `None`.

```markdown
## Architecture

<FCA-visible changes: fractals added, moved, or reclassified; INTENT.md /
DETAIL.md commits made by Stage 1; entry-point or boundary changes.>

## Code

<Behavioral changes grouped by owning fractal, one line each.>

## Test

<spec-document and test-record changes, with the case-count delta when it
moved.>
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

Stage 1 narrows only the FCA document audit, never the PR change list. Send every changed path through the one `context_resolve` batch, preserve changed-path order, and classify each result with the first applicable row:

| Evidence | Document scope | Action |
| --- | --- | --- |
| `context_resolve` returns `resolved: true` | FCA-owned | Keep `result.summary.ownerFractalPath`; a target under a config-excluded directory name is still FCA-owned through its enclosing fractal. |
| `resolved: false`, every diagnostic is `context-target-unresolved`, and `git cat-file -e HEAD:<path>` succeeds | existing ownerless non-FCA | Report the path and ownerless evidence; use a matching `structure.additionalExcludedDirectories` segment as the config-declared reason. |
| The target is absent from `HEAD`, including a deleted or renamed source | unresolved | Stop. A base-snapshot owner cannot be inferred from the current tree. |
| Any other failed diagnostic | unresolved | Stop and report it verbatim. |

`additionalExcludedDirectories` entries are directory names, not paths or globs. Compare complete project-relative directory segments; never match the basename or a partial segment. The config match is a reason, not an ownership override, and is consulted only after `resolved: false`. Config-declared and structural ownerless paths are listed in terminal progress and summarized by count in the PR Architecture section. They remain in the Code/Test analysis because non-FCA is a document-ownership verdict, not a request to hide the change.

When every changed path is non-FCA, Stage 1 completes the single `context_resolve` batch, makes no enrich-docs call, and reports `Document sync: no-change`. A failed item is never converted to non-FCA merely because ignoring it would let publication continue.
