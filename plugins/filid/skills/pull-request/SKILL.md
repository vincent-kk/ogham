---
name: pull-request
user-invocable: true
description: 'Sync branch FCA documents through enrich-docs, record what could not be repaired as a PR handoff, then open or update a structured GitHub pull request. Use when a branch is ready for a PR.'
argument-hint: '[--base REF] [--skip-enrich] [--draft] [--title TITLE] [--auto-approve] [--push|--no-push]'
version: '2.0.0'
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
3. The branch must have at least one commit not on the base ref.
4. Worktree state — ask the tool, do not classify by hand:

   ```text
   mcp__plugin_filid_tools__review_state({
     action: "assess",
     projectRoot: PROJECT_ROOT,
     branchName: BRANCH
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

## Stage 1 — FCA Document Sync

With `--skip-enrich`, step 4 is skipped; scope resolution, ownerless reporting and the handoff (steps 1–3, 7) still run.

At entry, initialize the handoff with `recorded: []`, `repaired: 0`, and `documentSync` unset. Every subsequent step records into this handoff; `reference.md` §7 defines its classes and serialization.

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

   Read ordered `data.results`, or the artifact results when inline `data` is absent. If the batch call fails, its artifact cannot be read, or `data.results` is missing after that fallback, record one `document-sync` entry with the diagnostic verbatim, set `Document sync: failed`, leave the owner set empty, skip step 4, and proceed to step 7.

   A `resolved: true` item contributes its `result.summary.ownerFractalPath`; keep its diagnostics visible. Apply `reference.md` §6 to `resolved: false` items: it defines the `context-target-unresolved`, `git cat-file -e HEAD:<path>`, and `structure.additionalExcludedDirectories` evidence for ownerless classification. For a path absent from `HEAD` — a deleted or renamed source — resolve its nearest ancestor directory that `git cat-file -e HEAD:<dir>` confirms and take that owner; when no ancestor resolves, or any other diagnostic appears, record the path and the diagnostic verbatim as an `unresolved-path` handoff entry (§7) and continue. Collect distinct resolved owners as the document audit scope; do not enrich the whole tree.

3. Report ownerless non-FCA paths and carry their count summary into Architecture as specified in §6. Keep all changed paths in Stage 3's PR analysis. With no owners, make no enrich-docs call and report `no-change`, unless the sync is already `failed` or the flag requires `skipped`.
4. When owners exist and `--skip-enrich` is absent, invoke `Skill("filid:enrich-docs", "<owner fractal paths> --include-detail --repair")` so the audit covers both INTENT.md and DETAIL.md. Append `--auto-approve` **exactly when this skill received it** — never by inferring that a pipeline is running. An orchestrator that wants unattended document sync passes the flag; without it, enrich-docs keeps its own approval step and a standalone run stays interactive.
5. Read the enrich-docs report when step 4 ran. Nothing here exits:

   | enrich-docs outcome | `Document sync` | Handoff |
   | --- | --- | --- |
   | `Enrich-docs complete` | `committed` when step 6 committed, otherwise `no-change` | `Repaired: n` becomes the repaired count; each `Needs rework` document and each `deferred:` line becomes an entry |
   | `Enrich-docs skipped: all RICH` | `committed` when step 6 committed, otherwise `no-change` | none |
   | `Enrich-docs cancelled` | `declined` | one `document-sync` entry: approval declined |
   | `Enrich-docs failed: <reason>` | `failed` | one `document-sync` entry carrying `<reason>` verbatim |
   | any other ending — unreadable artifact, missing marker | `failed` | one `document-sync` entry with the diagnostic verbatim |

   Resolve competing `Document sync` outcomes with this precedence: `failed` > `declined` > `skipped` > `committed` > `no-change`.

   `--skip-enrich` skips step 4 only: steps 1–3 and 7 still run, `Document sync` reports `skipped` subject to this precedence, and one `document-sync` entry names the flag.

6. Only when `git status --porcelain` reports `INTENT.md` / `DETAIL.md` changes, stage **only** those document paths and commit:

   ```text
   docs(filid): sync INTENT.md / DETAIL.md via enrich-docs
   ```

   For both `Enrich-docs complete` and `Enrich-docs skipped: all RICH`, decide the final `Document sync` from this step's actual commit result: `committed` when this step committed, otherwise `no-change`; preserve any higher-priority outcome. A `documents-only` worktree can carry user edits, so `documents-only → all RICH → commit success` reports `committed`.

   If `git add` or `git commit` fails, set `Document sync: failed`, record one `document-sync` entry with the diagnostic verbatim, and leave the worktree's document changes intact. Never report a failed commit as `committed`. Continue through step 7 to Stage 2.

7. Collect the remaining findings once: `mcp__plugin_filid_tools__fractal_inspect({ action: "validate", path: PROJECT_ROOT })` — `scopes` omitted, so every scope is evaluated. Read `data.result.violations`, or the artifact's equivalent, and `summary.snapshotHash`. Keep violations inside an owner fractal and project-wide violations whose `message` names an owner path; `RuleViolation` carries no evidence field. Retain project-wide findings with `path: "."` and no owner path in the message as `scope-uncertain` (§7). Classify retained violations and scan diagnostics with the §7 rules. If this call fails, its artifact cannot be read, or the required data is absent after the artifact fallback, record one `handoff-validate` entry with the diagnostic verbatim, set `snapshotHash` to `null` and `Document sync: failed`, and continue to Stage 2. These findings and the earlier step entries form the handoff; this step never stops the run.

Source modifications left by Stage 1 surface as a Stage 0 abort on the next run. That is the intended contract, not a defect. Generated paths do not — they are classified, not staged.

## Stage 2 — Base Branch Resolution

Use `--base` when given. Otherwise resolve in the order documented in `reference.md` §2 (configured remote default → `origin/main` → `origin/master`). Verify the ref exists before continuing.

## Stage 3 — Change Analysis and PR Body

1. Collect the commit subjects and the changed-file list for `<BASE_REF>...HEAD`.
2. Build the body with the four canonical sections in `reference.md` §3: **Architecture**, **Code**, **Test**, **FCA Handoff**. Every section is present even when its content is "none"; the handoff section follows §7.
3. Record the FCA document commit from Stage 1 in the Architecture section when one was made.
4. The PR title is English. The body follows the `[filid:lang]` language; technical terms, identifiers, and paths stay in their original form.
5. Apply the §7 budget procedure and validate the machine JSON. Always write the complete body first to `<data.reviewDirectory>/pr-body.md`, using `data.reviewDirectory` from Stage 0's `review_state({ action: "assess" })` call; Stage 4 publishes from this file.

## Stage 4 — PR Publication

Refresh remote state after Stage 1's document commit: run `git rev-parse --verify -q refs/remotes/origin/<BRANCH>` and, when it resolves, `git rev-list --count origin/<BRANCH>..HEAD`. Set `UNPUSHED = true` when the remote branch is missing or the count is positive; otherwise set `UNPUSHED = false`. Use this current value for both `--push` and `--no-push` below.

1. `UNPUSHED = true` and `--push` on (the default): run `git push -u origin <BRANCH>` first — a PR opened from a stale remote head would review commits the branch no longer matches. `UNPUSHED = true` and `--push` off (`--no-push`): skip `gh` entirely, report Stage 3's saved body, and print the §1 unpushed-branch message. `UNPUSHED = false`: continue.
2. With `GH_AUTH = false` or `--no-push`, report `<data.reviewDirectory>/pr-body.md` as `body-saved` instead of publishing. Otherwise `gh pr view` decides create versus update.
3. <!-- [INTERACTIVE] --> An existing PR requires an explicit overwrite confirmation before its body is replaced.
4. Read the saved body through `--body-file <data.reviewDirectory>/pr-body.md` when calling `gh pr create` or `gh pr edit`. `--draft` creates a draft PR.
5. Keep the branch-specific saved body after publication or a publication failure and report the URL or saved path. The branch segment prevents another branch from overwriting this run's body.

## Options

| Option           | Type   | Default | Effect                                                                                                              |
| ---------------- | ------ | ------- | ------------------------------------------------------------------------------------------------------------------- |
| `--base REF`     | string | auto    | Base branch for the diff and the PR                                                                                 |
| `--skip-enrich`  | flag   | off     | Skip the enrich-docs call in Stage 1; scope resolution and the handoff still run                                     |
| `--auto-approve` | flag   | off     | Forwarded to `enrich-docs`, which then writes without asking                                                        |
| `--draft`        | flag   | off     | Create the PR as a draft                                                                                            |
| `--title TITLE`  | string | auto    | PR title; generated when omitted                                                                                    |
| `--push`         | flag   | on      | Push an unpushed branch before Stage 4; `--no-push` turns it off, and the run then ends with a saved body, not a PR |

## Invariants

- This skill never edits source code. Stage 1 changes documents only, through `enrich-docs`, which validates what it writes and asks for approval unless `--auto-approve` was forwarded.
- `--push` is on by default: an unpushed branch is pushed before the PR opens, and the push is always named in the terminal output — never silent. With `--no-push` the run ends in a saved body and a message naming the cause.
- Only `INTENT.md` / `DETAIL.md` are staged by this skill. Any other staged path is a defect.
- Generated paths are classified so the cycle can continue, never staged and never committed. Committing build output stays the developer's call.
- Config-declared and existing ownerless non-FCA paths are reported and excluded only from document sync. An unresolved path missing from `HEAD` or carrying another diagnostic is recorded as `unresolved-path` in the handoff and never blocks PR creation.
- Document sync never blocks PR creation. What Stage 1 could not repair, and a sync that failed, was declined, or was skipped with `--skip-enrich`, is recorded in the PR body's `FCA Handoff` section and in the `Handoff:` terminal line; `cross-review` reads the body as change context.
- Stage 1 repairs document-contract findings only. Source, import, dependency and file-placement findings are recorded, never fixed here.
- Input-error aborts are exactly Stage 0's detached/empty branch, no commits ahead of base, `source-dirty` worktree, and `documents-only` with `--skip-enrich`; and Stage 2's unresolved base. Base resolution never guesses silently.
- `GH_AUTH = false` and `--no-push` are body-saving publication fallbacks, not aborts. The saved body retains the handoff.

## Terminal Output

```text
Pull request: <created|updated|body-saved> <url-or-path>
Document sync: <committed|no-change|skipped|declined|failed>
Handoff: <N> recorded (<c> code-change, <d> config-decision, <i> indeterminate, <r> needs-rework, <u> unresolved-path, <s> document-sync), <R> repaired
Branch push: <pushed|up-to-date|declined>
```

The six class counts sum to `<N>`. For `body-saved`, print `Pull request: body-saved <path>` with `<path>` equal to `<data.reviewDirectory>/pr-body.md`, exactly as written in Stage 3.
