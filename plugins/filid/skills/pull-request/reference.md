# pull-request — Reference

## §1 Abort and block messages

Emit these verbatim; the pipeline matches on the first line.

**Stage 0 — dirty worktree**

```text
Pull request aborted: the worktree has uncommitted non-document changes.
Commit or stash them first. Only INTENT.md / DETAIL.md may be dirty, because
Stage 1 is their sole committer.
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
- It does not push. The branch must already be pushed, or `gh` will report the failure and Stage 4 falls back to saving the body locally.
- It does not edit source code. Stage 1 touches documents only.
- It does not create or resolve debt records. Rejections are recorded by `resolve` in `justifications.md`.
