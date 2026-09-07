---
name: pull-request
user-invocable: true
description: 'Sync branch FCA documents through enrich-docs, record what could not be repaired as a PR handoff, then open or update a structured GitHub pull request. Use when a branch is ready for a PR.'
argument-hint: '[--base REF] [--skip-enrich] [--draft] [--title TITLE] [--auto-approve] [--push|--no-push] [--issue URL] [--spec URL] [--decision URL|PATH] [--screenshot URL|PATH] [--focus TEXT] [--notes PATH]'
version: '2.3.0'
complexity: complex
plugin: filid
---

# pull-request — Documented PR Creation

Run this skill as one continuous operation. Do not ask whether to continue between stages. Yield only at the marked overwrite confirmation, for an unrecoverable source-state error, or after the terminal output.

The PR is where document work happens: Stage 1 drafts missing documents, repairs document-contract findings for the fractals this branch touched, commits those documents, and records everything it could not repair in the PR body's `FCA Handoff` section. Document sync never blocks publication.

## References

Resolve files relative to this `SKILL.md`:

- `reference.md` — abort and publication messages, base resolution, PR body layout, dirty and non-FCA classification, and the handoff contract.

Related: `/filid:enrich-docs` (invoked in Stage 1), `/filid:cross-review` (chain after the PR exists), `/filid:pipeline` (runs this as `pr-create`).

## Stage 0 — Prerequisites

1. Resolve absolute `PROJECT_ROOT`.
2. Read the current branch. A detached or empty branch name is an unrecoverable input error.
3. Resolve the base **before** assessment or document sync. Run the executable relative to this `SKILL.md`, passing the user's `--base` only when supplied:

   ```text
   node <skill-directory>/scripts/resolveBaseBranch.mjs --project-root <PROJECT_ROOT> [--base <REF>]
   ```

   Read its JSON: retain `baseRef` as `BASE_REF` and `baseBranch` as `BASE_BRANCH` for all stages. An explicit base skips inference. Report `source`, `ahead`, `behind`, and any `ambiguous` / `tiedCandidates` evidence; never reimplement the ranking in the prompt. A nonzero exit stops with its diagnostic and the §1 base-resolution message. The branch must have at least one commit not on the base ref; the script enforces this too. `reference.md` §2 defines the local-ref snapshot and ambiguity contract.

4. Worktree state — ask the tool, do not classify by hand:

   ```text
   mcp__plugin_filid_tools__review_state({
     action: "assess",
     projectRoot: PROJECT_ROOT,
     branchName: BRANCH,
     baseRef: BASE_REF
   })
   ```

   Retain `data.reviewDirectory` from this assessment as the tool's normalized branch directory for Stage 3/4. Act on `summary.worktreeDisposition` (`reference.md` §5 explains the classes):

   | `worktreeDisposition`                         | Stage 0       |
   | --------------------------------------------- | ------------- |
   | `clean` · `documents-only` · `generated-only` | pass          |
   | `source-dirty`                                | abort with §1 |

   Report the paths in `data.assessment.worktree.source` with the abort message. A build artifact is never a reason to refuse a PR, and generated paths are never staged here. With `--skip-enrich`, `documents-only` also aborts — nothing will commit them.

5. `gh auth status` — on failure set `GH_AUTH = false`, continue through Stage 3's body save, and report the saved path in Stage 4.
6. Remote state — `git rev-parse --verify -q refs/remotes/origin/<BRANCH>`; when it resolves, `git rev-list --count origin/<BRANCH>..HEAD`. Set `UNPUSHED = true` when the remote branch is missing or that count is above zero. Not an abort: `--push` is on by default, so Stage 4 pushes the branch before opening the PR; with `--no-push` Stage 4 saves the body instead of calling `gh`, whose own error (`Head sha can't be blank`) never names the cause.
7. Caller inputs — read every `--issue`, `--spec`, `--decision`, `--screenshot`, `--focus`, and `--notes` value and preserve the normalized result as `INPUTS` through Stage 3. Parse a present notes file with `reference.md` §8; when it is missing or unreadable, report it, retain no notes content, and continue.
   - For each repository-relative `--decision` path, require `git cat-file -e HEAD:<path>`. When it exists, obtain the repository URL with `gh repo view --json url -q .url` and render its `https://<host>/<owner>/<repo>/blob/<BRANCH>/<path>` link. When either operation fails, discard that decision item, report it in the terminal, and continue.
   - Upload each local `--screenshot` path now with `gh image <path>` so Stage 3 has the emitted Markdown reference before saving the body. If the extension is unavailable or upload fails, retain the local path marked `(not uploaded)` in `INPUTS`, report the failure, and continue.

## Stage 1 — FCA Document Sync

With `--skip-enrich`, step 4 is skipped; scope resolution, ownerless reporting and the handoff (steps 1–3) still run.

At entry, initialize `HANDOFF_ENTRIES = []`, `REPAIRED = 0`, and leave `documentSync` unset. Subsequent findings append to `HANDOFF_ENTRIES`; `reference.md` §7 defines the entry contract.

1. Derive the changed paths: `git diff --name-only <BASE_REF>...HEAD`.
2. Map all changed paths to their owning fractals with one `fractal_inspect` `resolve` batch:

   ```text
   mcp__plugin_filid_tools__fractal_inspect({
     action: "resolve",
     path: PROJECT_ROOT,
     requests: [
       { targetPath: <changed path 1> },
       { targetPath: <changed path 2> }
     ]
   })
   ```

   Read ordered `data.results`, or the artifact results when inline `data` is absent. If the batch call fails, its artifact cannot be read, or `data.results` is missing after that fallback, append `{ class: "document-sync", ruleId: "document-sync", path: ".", note: <diagnostic verbatim> }` to `HANDOFF_ENTRIES`, set `Document sync: failed`, leave the owner set empty, skip step 4, and proceed to step 7.

   A `resolved: true` item contributes its `result.summary.ownerFractalPath`; keep its diagnostics visible. Apply `reference.md` §6 to `resolved: false` items: it defines the `context-target-unresolved`, `git cat-file -e HEAD:<path>`, and `structure.additionalExcludedDirectories` evidence for ownerless classification. For a path absent from `HEAD` — a deleted or renamed source — resolve its nearest ancestor directory that `git cat-file -e HEAD:<dir>` confirms and take that owner; when no ancestor resolves, or any other diagnostic appears, append `{ class: "unresolved-path", ruleId: <diagnostic code>, path: <changed path>, note: <diagnostic verbatim> }` to `HANDOFF_ENTRIES` and continue. Collect distinct resolved owners as the document audit scope; do not enrich the whole tree.

3. Report ownerless non-FCA paths and carry their count summary into the `(non-FCA)` row and the bullet list of the `Changes` block as specified in §6. Keep all changed paths in Stage 3's PR analysis. With no owners, make no enrich-docs call and report `no-change`, unless the sync is already `failed` or the flag requires `skipped`.
4. When owners exist and `--skip-enrich` is absent, invoke `Skill("filid:enrich-docs", "<owner fractal paths> --include-detail --repair")` so the audit covers both INTENT.md and DETAIL.md. Append `--auto-approve` **exactly when this skill received it** — never by inferring that a pipeline is running. An orchestrator that wants unattended document sync passes the flag; without it, enrich-docs keeps its own approval step and a standalone run stays interactive.
5. Read the enrich-docs report when step 4 ran. Nothing here exits:

   | enrich-docs outcome                                    | `Document sync`                                          | Handoff                                                                                                                                                                                                                            |
   | ------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | `Enrich-docs complete`                                 | `committed` when step 6 committed, otherwise `no-change` | Set `REPAIRED` from `Repaired: n`; append each `Needs rework` document as `{ class: "needs-rework", ruleId: "needs-rework", path, note }` and each `deferred:` line as `{ class: "needs-rework", ruleId: "deferred", path, note }` |
   | `Enrich-docs skipped: all RICH`                        | `committed` when step 6 committed, otherwise `no-change` | none                                                                                                                                                                                                                               |
   | `Enrich-docs cancelled`                                | `declined`                                               | Append `{ class: "document-sync", ruleId: "document-sync", path: ".", note: "approval declined" }` to `HANDOFF_ENTRIES`                                                                                                            |
   | `Enrich-docs failed: <reason>`                         | `failed`                                                 | Append `{ class: "document-sync", ruleId: "document-sync", path: ".", note: <reason verbatim> }` to `HANDOFF_ENTRIES`                                                                                                              |
   | any other ending — unreadable artifact, missing marker | `failed`                                                 | Append `{ class: "document-sync", ruleId: "document-sync", path: ".", note: <diagnostic verbatim> }` to `HANDOFF_ENTRIES`                                                                                                          |

   Resolve competing `Document sync` outcomes with this precedence: `failed` > `declined` > `skipped` > `committed` > `no-change`.

   `--skip-enrich` skips step 4 only: steps 1–3 and 7 still run, `Document sync` reports `skipped` subject to this precedence, and `{ class: "document-sync", ruleId: "document-sync", path: ".", note: "--skip-enrich" }` is appended to `HANDOFF_ENTRIES`.

6. Only when `git status --porcelain` reports `INTENT.md` / `DETAIL.md` changes, stage **only** those document paths and commit:

   ```text
   docs(filid): sync INTENT.md / DETAIL.md via enrich-docs
   ```

   For both `Enrich-docs complete` and `Enrich-docs skipped: all RICH`, decide the final `Document sync` from this step's actual commit result: `committed` when this step committed, otherwise `no-change`; preserve any higher-priority outcome. A `documents-only` worktree can carry user edits, so `documents-only → all RICH → commit success` reports `committed`.

   If `git add` or `git commit` fails, set `Document sync: failed`, append `{ class: "document-sync", ruleId: "document-sync", path: ".", note: <diagnostic verbatim> }` to `HANDOFF_ENTRIES`, and leave the worktree's document changes intact. Never report a failed commit as `committed`. Continue through step 7 to Stage 2.

7. Remaining findings are computed by `review_state handoff` in Stage 3 step 8; this step records nothing.

Source modifications left by Stage 1 surface as a Stage 0 abort on the next run. That is the intended contract, not a defect. Generated paths do not — they are classified, not staged.

## Stage 2 — Base Branch Resolution

Keep the `BASE_REF` and `BASE_BRANCH` resolved in Stage 0. Verify `BASE_REF` still exists before continuing; do not re-estimate after the document commit or replace the selected ref with the default branch.

## Stage 3 — Change Analysis and PR Body

1. Collect branch-only commit subjects with `git log --format=%s <BASE_REF>..HEAD`. Collect changed paths with `git diff --name-only <BASE_REF>...HEAD`, Kind evidence with `git diff --name-status -M <BASE_REF>...HEAD`, file statistics with `git diff --stat <BASE_REF>...HEAD`, and summary statistics with `git diff --shortstat <BASE_REF>...HEAD`. The triple-dot diff starts at the merge-base and excludes base-only changes.
2. Build the body from `reference.md` §3: five open sections on top, four collapsed regions below, in that order; optional sections are omitted when their inputs are absent.
3. Build the `Changes` rows only from Stage 1's resolved `ownerFractalPath` set and the name-status output from step 1:
   - Start with one row for each owner fractal. Add a `removed` row directly from `D <F>/INTENT.md` and a `moved` row directly from `R… <old>/INTENT.md <F>/INTENT.md` even when the deleted source has no current owner. Add one final `(non-FCA)` row when ownerless paths exist; its `What changed` cell gives their count and whether configuration declares the exclusion.
   - Derive `Kind` by first match: `removed` for `D <F>/INTENT.md`; `new` for `A <F>/INTENT.md`; `moved` for `R… <old>/INTENT.md <F>/INTENT.md`, with `<old> → <F>` in `What changed`; `boundary` for `M <F>/INTENT.md` or a changed non-document file directly below `<F>` rather than a subdirectory; `test` when every changed path under `<F>` has a `__tests__`, `tests`, `test`, `spec`, `specs`, `e2e`, or `fixtures` segment or a filename containing `.test.` or `.spec.`; otherwise `behavior`. The verification-path predicate is an approximation.
   - Sort `removed`, `new`, `moved`, and `boundary` first in that order, each by changed-file count descending, then sort `test` and `behavior` by changed-file count descending. Do not display those counts in the rows.
   - Derive `Contract` bullets only from `new`, `removed`, `moved`, and `boundary` rows, one consumer-visible change per fractal. `behavior` and `test` never enter `Contract`.
   - Source the `Changes` `<summary>` file and line statistics from `git diff --shortstat <BASE_REF>...HEAD` and its fractal count from the distinct owner-fractal set.
4. Record the FCA document commit from Stage 1 as a bullet under the `Changes` table when one was made.
5. Links, Review notes, Work context, and Verification are never inferred. Use only caller options or notes, commands run and observed before this skill invocation, files actually present in the branch diff, and commit messages. Never infer a design decision by reading code.
6. Include a mermaid diagram only for a relationship-changing change; keep it to at most 12 nodes and 600 characters including its fence, then add one sentence stating its point. Do not prescribe an authoring method.
7. The PR title is English. The body follows the `[filid:lang]` language; technical terms, identifiers, and paths stay in their original form.
8. Write the human body without `## FCA Handoff` to `<data.reviewDirectory>/pr-body.md`, using `data.reviewDirectory` from Stage 0's `review_state({ action: "assess" })` call. Then call:

   ```text
   mcp__plugin_filid_tools__review_state({
     action: "handoff",
     projectRoot: PROJECT_ROOT,
     baseRef: BASE_REF,
     documentSync,
     repaired: REPAIRED,
     entries: HANDOFF_ENTRIES
   })
   ```

   Append the file at `data.handoffPath` with `printf '\n' >> <pr-body.md> && cat <data.handoffPath> >> <pr-body.md>`, and take the `Handoff:` terminal counts from `summary` and `data.counts`. If the response is an error envelope with no `data.handoffPath`, no section was written. Retry the same call once. If it fails again, publish the body without the section, set `Document sync: failed`, print the `Handoff:` line with zero counts and `<R> repaired`, then the diagnostic verbatim. Stage 4 publishes from this file unchanged.

## Stage 4 — PR Publication

Refresh remote state after Stage 1's document commit: run `git rev-parse --verify -q refs/remotes/origin/<BRANCH>` and, when it resolves, `git rev-list --count origin/<BRANCH>..HEAD`. Set `UNPUSHED = true` when the remote branch is missing or the count is positive; otherwise set `UNPUSHED = false`. Use this current value for both `--push` and `--no-push` below.

1. `UNPUSHED = true` and `--push` on (the default): run `git push -u origin <BRANCH>` first — a PR opened from a stale remote head would review commits the branch no longer matches. `UNPUSHED = true` and `--push` off (`--no-push`): skip `gh` entirely, report Stage 3's saved body, and print the §1 unpushed-branch message. `UNPUSHED = false`: continue.
2. With `GH_AUTH = false` or `--no-push`, report `<data.reviewDirectory>/pr-body.md` as `body-saved` instead of publishing. Otherwise `gh pr view` decides create versus update.
3. <!-- [INTERACTIVE] --> An existing PR requires an explicit overwrite confirmation before its body is replaced.
4. Read the saved body through `--body-file <data.reviewDirectory>/pr-body.md` when calling `gh pr create --base <BASE_BRANCH>` or `gh pr edit --base <BASE_BRANCH>`. Use the branch name returned by the script, never a remote-qualified diff ref. The existing PR confirmation covers its body and selected base. `--draft` creates a draft PR. If GitHub rejects the body for its 65,536-character limit, keep the file unchanged and report `body-saved`; never fold it.
5. Keep the branch-specific saved body after publication or a publication failure and report the URL or saved path. The branch segment prevents another branch from overwriting this run's body.

## Options

| Option                   | Type     | Default | Effect                                                                                                              |
| ------------------------ | -------- | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `--base REF`             | string   | auto    | Base branch for the diff and the PR                                                                                 |
| `--skip-enrich`          | flag     | off     | Skip the enrich-docs call in Stage 1; scope resolution and the handoff still run                                    |
| `--auto-approve`         | flag     | off     | Forwarded to `enrich-docs`, which then writes without asking                                                        |
| `--draft`                | flag     | off     | Create the PR as a draft                                                                                            |
| `--title TITLE`          | string   | auto    | PR title; generated when omitted                                                                                    |
| `--push`                 | flag     | on      | Push an unpushed branch before Stage 4; `--no-push` turns it off, and the run then ends with a saved body, not a PR |
| `--issue URL`            | string[] | none    | Add an Issue link; repeatable, and only an explicit `closes:` prefix adds a closing keyword                         |
| `--spec URL`             | string[] | none    | Add a Spec link; repeatable                                                                                         |
| `--decision URL\|PATH`   | string[] | none    | Add a Decision link; repeatable, with repository-relative paths validated at `HEAD`                                 |
| `--screenshot URL\|PATH` | string[] | none    | Add a screenshot; repeatable, with local paths uploaded during Stage 0                                              |
| `--focus TEXT`           | string   | none    | Supply `Review notes` / `Start here`                                                                                |
| `--notes PATH`           | string   | none    | Read caller-authored `Summary`, `Review notes`, `Verification`, and `Work context` prose                            |

## Invariants

- This skill never edits source code. Stage 1 changes documents only, through `enrich-docs`, which validates what it writes and asks for approval unless `--auto-approve` was forwarded.
- `--push` is on by default: an unpushed branch is pushed before the PR opens, and the push is always named in the terminal output — never silent. With `--no-push` the run ends in a saved body and a message naming the cause.
- Only `INTENT.md` / `DETAIL.md` are staged by this skill. Any other staged path is a defect.
- Generated paths are classified so the cycle can continue, never staged and never committed. Committing build output stays the developer's call.
- Config-declared and existing ownerless non-FCA paths are reported and excluded only from document sync. An unresolved path missing from `HEAD` or carrying another diagnostic is recorded as `unresolved-path` in the handoff and never blocks PR creation.
- Document sync never blocks PR creation. What Stage 1 could not repair, and a sync that failed, was declined, or was skipped with `--skip-enrich`, is recorded in the PR body's `FCA Handoff` section and in the `Handoff:` terminal line; `review` reads the body's handoff block and top sections as change context.
- Stage 1 repairs document-contract findings only. Source, import, dependency and file-placement findings are recorded, never fixed here.
- Input-error aborts are exactly Stage 0's detached/empty branch, no commits ahead of base, `source-dirty` worktree, and `documents-only` with `--skip-enrich`; and Stage 2's unresolved base. Base resolution never guesses silently.
- `GH_AUTH = false` and `--no-push` are body-saving publication fallbacks, not aborts. The saved body retains the handoff.
- Links, Review notes, Verification and Work context are never inferred from code; absent inputs omit the section, they never invent it.
- The body never carries secrets, tokens, or Claude session identifiers; a screenshot that failed to upload stays a local path marked `(not uploaded)`.

## Terminal Output

```text
Pull request: <created|updated|body-saved> <url-or-path>
Document sync: <committed|no-change|skipped|declined|failed>
Handoff: <N> recorded (<c> code-change, <d> config-decision, <i> indeterminate, <r> needs-rework, <u> unresolved-path, <s> document-sync), <R> repaired
Branch push: <pushed|up-to-date|declined>
```

The six class counts sum to `<N>`. For `body-saved`, print `Pull request: body-saved <path>` with `<path>` equal to `<data.reviewDirectory>/pr-body.md`, exactly as written in Stage 3.
