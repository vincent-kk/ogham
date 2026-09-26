# Facts Bootstrap



Canonical procedure for every filid skill whose judgments read dependency references. Each such skill links here from one short step placed before its first reference-based analysis call; the steps live only in this file.

Run the steps in order, in the same turn as the calling skill, and return to the calling skill's next step when step 8 or the failure section ends the bootstrap. `PROJECT_ROOT` is the absolute project root the calling skill analyses.

## Tool use

- If the `facts` schema is absent, call `ToolSearch` once with `select:mcp__filid__facts`.
- The extractor runs in step 2 are the only Bash calls this procedure makes, and each runs the extractor alone: it creates its output file with `mktemp`, runs the extractor, and prints only that file's path. Pass the path to `submit`; never print or read the output file. Never run git.
- Never write project configuration here. Declaring scope edits `.filid/config.json`, which dirties the worktree a review is judging.
- When a step needs the agent to read a source file itself (steps 3 and 4), read it with the Read tool, not Bash.

## Steps

### 1. Read the status

```text
mcp__filid__facts({ action: "status", path: PROJECT_ROOT })
```

`summary` carries `projectState`, `resolutionEpoch`, `scopeSource`, `extractionList` and `attestationRequirement`; keep those. `data` carries the lists: `missing`, `needsResolution`, `uncertain`, `toolError` and `indeterminate` are each `{ paths, truncated }`; `rejected` is `{ items, truncated }` where each item names its own `path`, `code` and `nextAction` (plus `specifier`, `inputPath` or `lines` where filid can name them); `unadjudicated` is `{ items, truncated }`; `awaitingComparison` is `{ items, truncated }` where each item names its `path` and, when a record is stored for it, the `storedTool` that wrote it; `pendingAttestations` is a list of `{ path, actor, contentHash, nextAction }`.

A response's own `nextAction` and `attestationRequirement` are the contract. Where this document and a response differ, the response wins.

An `uncertain` file has a reason, and the reason decides the action — route by the reason, never by `uncertain` itself. Five reasons arrive as lists in `data`, and one more as a `facts-judgements-unreadable` diagnostic on the response, which names a shard rather than any file:

- `rejected` → step 4, item by item.
- `unadjudicated` → step 5.
- `pendingAttestations` → step 6.
- `indeterminate` → the provider could not vouch for a reference in that file; it needs an attested record, so it goes to step 6 too.
- `awaitingComparison` → step 7, second half. A discard took this file's judgements and nobody has re-derived them; the response carries `facts-judgements-discarded` beside the list.
- a `facts-judgements-unreadable` diagnostic → step 7. The files it holds uncertain are in none of the lists, because what did not read is what would have named them.

When a list's `truncated` is above zero the server left entries out of it: handle the ones it returned, then call `status` again for the rest.

- `scopeSource: "default"` means the project declared no `facts.covers`, so the scope is the adapters' source extensions. That is a working scope, not a missing one: continue. A report that says what was analysed says this too.
- `projectState: "facts-uninitialized"` means the scope in effect covers no file at all. Outside a review, follow the diagnostic: set `facts.covers` in the project's `.filid/config.json`, then call `status` again. Inside a review, do not edit config — record the diagnostic and follow the calling skill's rule for an incomplete bootstrap.
- Otherwise continue with the first later step whose list is non-empty; when every list is empty and no judgements diagnostic remains, go to step 8.

### 2. Extract and submit (`missing`, `needsResolution`)

The server owns the scope. `extractionList.path` names a file it wrote holding the paths to extract, and `extractionList.count` how many; the agent passes that path straight through and never reads or edits it. The list holds exactly the in-scope files whose record is absent or stale — `missing` and `needsResolution` — so a file that already has a record filid accepts is never on it. `extractionList.unrepresentable` counts in-scope files whose names a line-oriented list cannot carry — they are absent from the list and stay `missing`; report that number rather than trying to extract them.

Run the bundled extractor in one Bash call that creates a unique output file and prints only its path:

```text
FACTS_OUT=$(mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX") && node "${CLAUDE_PLUGIN_ROOT}/bridge/filid-facts.mjs" --root PROJECT_ROOT --files-from EXTRACTION_LIST_PATH --out "$FACTS_OUT" > /dev/null && echo "$FACTS_OUT"
```

- Keep the printed path as `FACTS_OUT`. Every run creates its own file, so extractions by other sessions or projects sharing the directory never overwrite it.
- The output must lie outside the project tree: the server refuses a submission from inside it, and a file there joins the scanned path list and moves the epoch by itself.
- If `CLAUDE_PLUGIN_ROOT` is not set, locate the extractor with `Glob(**/bridge/filid-facts.mjs)`.
- To extract a subset — one file the calling skill cares about, or one part of a split submission — pass those project-relative paths as positional arguments, or pipe them to `--files-from -`, in the same shape of call. This is also the way out when an analysis reports that a file's record carries nothing for the axis it needs: that file is `exact`, so the extraction list does not hold it, and running the bootstrap again would re-extract nothing. Its diagnostic's `nextAction` says so; extract that one path with a tool that reports the section, or attest it (step 6).

Submit the output file with the epoch from step 1:

```text
mcp__filid__facts({ action: "submit", path: PROJECT_ROOT, file: FACTS_OUT, resolutionEpoch })
```

An accepted submission replaces each submitted file's record. Whole-call refusals go to step 3; per-record and per-reference entries in `rejected` go to step 4.

### 3. Recover a refused submission

- `facts-epoch-moved` — the path list or a resolution input changed; nothing was stored. `added` and `removed` answer one question — what moved since the epoch this call carried was read — so they are the paths to look at, not a full inventory of the tree. Take the new `resolutionEpoch` from the response, call `status` again for a current `extractionList`, and extract again from step 2.
- `facts-tree-unstable` — the epoch kept moving across repeated extractions, and `added`/`removed` name what moved between the reads rather than everything in the tree. Outside a review, delete the files the response names, add them to `.gitignore` or `facts.excludes`, or stop the process writing into the tree, then return to step 1; inside a review, change nothing in the project — record the diagnostic and follow the calling skill's rule for an incomplete bootstrap.
- `facts-file-too-large` — split the submission without reading the list. Run the extractor once per share over the same `extractionList.path`, adding `--part <i>/<n>`: `--part 1/2` and `--part 2/2` cover the list between them and overlap in nothing. Each run makes its own output — `FACTS_PART=$(mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX")`, then `--files-from EXTRACTION_LIST_PATH --part <i>/<n> --out "$FACTS_PART" > /dev/null` and `echo "$FACTS_PART"` in the same call — and each printed path is submitted with the same `resolutionEpoch`. Raise `n` while a part is still too large. Each call replaces only the records it carries.
- `facts-record-changed` or `facts-side-table-changed` — another writer replaced a record or took the side-table page first. Return to step 1.
- `facts-file-path-not-absolute`, `facts-file-inside-project`, `facts-file-not-regular`, `facts-file-unreadable`, `facts-file-not-json` — the submission file itself was wrong. Re-run the extractor into a fresh `mktemp` path outside the project and submit that.

The last two families are not `submit`'s alone: any action that opens a file the agent passes in, or that writes a shared page, answers with the same codes, and each response writes its `nextAction` in the action that produced it. For a page another writer took first, `compare` runs the same comparison again, `adjudicate` re-reads the current items and `contentHash` first, and `discard-pending` drops again only what still holds a pending attestation. Follow the sentence the response carries rather than the `submit` recovery above.

### 4. Act on each rejected claim (`rejected`)

`data.rejected.items` names each refused claim with its `path`, its `code` and the one `nextAction` that changes it, and — where filid can name them — the `specifier`, the `inputPath` or the `lines` to read. Act from the item: its `nextAction` is the contract, and what follows only says which family of action it belongs to.

- Codes about moved bytes (`facts-content-hash-mismatch`, `facts-resolution-input-stale`) are fixed by extracting that path again as step 2 does and submitting it.
- Codes a re-extraction only reproduces — the server cannot read something (`facts-resolution-input-unreadable`, `facts-source-file-unreadable`), or the record's content is what the extractor got wrong (`facts-record-schema-invalid`, `facts-reference-absent`, `facts-resolved-path-invalid`, `facts-exported-name-absent`) — are not re-extracted. Follow the item's `nextAction`: submit the file again from another tool, or, where the item says the file needs one, as an attested record (step 6). Changes the item asks for in the project itself — permissions, `facts.excludes`, deleting a declared input — belong outside a review; inside a review, change nothing, record the item and follow the calling skill's rule for an incomplete bootstrap.
- `facts-contract-group-absent` — the record links a verification file to a contract group whose `filid:contract <group-id>` marker is not in the file. Two ways out, and the item says which one it means: extract that path again and submit it, or, when the link is the one intended, add the marker to the spec document — an edit to the project, so outside a review only.
- `facts-record-out-of-scope` and `facts-record-path-invalid` mean the path is not one this project covers: drop it from the batch.

A `toolError` caused by a real syntax error is fixed in the source outside a review; during a review a changed file in that state becomes a review candidate whose rule is `facts-tool-error` — a finding, not a refusal, and it does not hold the bootstrap open. A file whose tool cannot read it at all is attested instead (step 6).

### 5. Adjudicate open items (`unadjudicated`)

`data.unadjudicated.items` holds one entry per open item, and every value an `adjudicate` call needs is in it: `path`, `lines`, `kind`, `reference`, `resolvedPath`, `contentHash`, `state`, and `origin`. Read the lines the item names in that file, then decide it from those values alone — do not re-derive them, and do not call `compare` here; `compare` exists for a verifier checking an independent extraction against the store.

```text
mcp__filid__facts({
  action: "adjudicate",
  path: PROJECT_ROOT,
  sourcePath,
  contentHash,
  actor,
  items: [{ kind, reference, resolvedPath, decision: "adopt" }],
})
```

Each element of `items` carries `kind`, `reference` and `resolvedPath` copied from the item, `decision` (`"adopt"` or `"dismiss"`), and `reason` for a dismissal.

- `sourcePath` and `contentHash` come from the item. A judgement made against other bytes is refused with `facts-adjudication-stale-content`; call `status` again and judge the item as it now stands.
- `actor` is required and non-empty, or the call is refused with `facts-adjudication-actor-required`.
- Each item repeats the `kind`, `reference` and `resolvedPath` the status reported; an item the side table does not hold is refused with `facts-adjudication-no-such-item`.
- `adopt` — the reference is real. One actor settles it and the edge is added.
- `dismiss` — the reference is not there (a comment, a string, or a wrong resolution); it carries `reason`, or the item is refused with `facts-adjudication-reason-required`. A dismissal waits for a different actor: brief a separate subagent with the item's file and lines only, have it read them independently and send its own `adjudicate` under its own `actor`. The actor that raised or dismissed an item cannot confirm it, and when the two disagree the item settles as `adopt`.

### 6. Attest what no tool can settle (`pendingAttestations`, `indeterminate`)

Some files no tool output can settle: the tool cannot read them, a re-extraction only reproduces the same refusal, or the provider could not vouch for a reference. Those carry an attested record — one an agent writes after reading the file itself.

`summary.attestationRequirement` states when such a record is owed, what it must carry, that every line the reference pattern matches is accounted for as a reference or in `nonReferences`, and that a second actor confirms it. It is the contract; this step only says who does what.

- **First submission.** The agent that reads the file writes the record and submits it with its own `actor`: `mcp__filid__facts({ action: "submit", path: PROJECT_ROOT, file: FACTS_OUT, resolutionEpoch, actor })`. It is stored as pending, so the file stays `uncertain`, and the response's `attested[]` entry says so. A record that leaves a matching line unexplained is refused instead, with the line numbers to read.
- **Confirmation.** Each entry of `data.pendingAttestations` names the `path`, the `actor` that must NOT confirm it, and the `contentHash` the confirmation has to read. Brief a separate subagent with the file and those values only — never with the pending record's content — and have it read the file itself and submit its own attested record under its own `actor`. Matching records store the record and the file leaves `uncertain`.
- **Disagreement.** A second answer that differs stores nothing and leaves the pending attestation as it was; the response names the lines that settle it. Read those lines and submit a record that settles them. If the two answers differ a second time, call `mcp__filid__facts({ action: "discard-pending", path: PROJECT_ROOT, sourcePaths })` for that file and record `facts bootstrap incomplete: step 6 attestation-mismatch` — do not send a third pair of readings, because a call identical to one already made cannot finish (step 8).
- A tool-tier submission that succeeds for the same file discards the pending attestation by itself; nothing extra is owed.

### 7. Discard a judgement shard nothing can read (`facts-judgements-unreadable`)

The store keeps judgements in shards. When one does not read, the adopted edges and open items it holds are invisible, so every file it covers is reported `uncertain` rather than settled — and no list can name those files, because the thing that did not read is what would have named them. The diagnostic names the shard and which of the two damages it is.

- **Unreadable** — the process cannot open the file. That is an environment fault, not a store fault: restore read access to that path under the plugin cache and call `status` again. Inside a review, change nothing; record the diagnostic and follow the calling skill's rule for an incomplete bootstrap.
- **Unparseable** — the bytes are there but are not a shard. Nothing can rewrite it in place, because the items that would be written are the ones nobody can read, so it is dropped:

```text
mcp__filid__facts({ action: "discard-damaged", path: PROJECT_ROOT, shards })
```

`shards` holds the shard names exactly as the diagnostic reported them, and nothing else — a shard the store can read comes back in `data.refused` with `facts-shard-not-damaged`, and the response says to call `status` again and pass only what its judgements diagnostic reports as unparseable. `data.discarded` names what went, and `summary.affectedFiles` counts only the files the discard marked. A discard that dropped a pending shard rather than a judgement one answers `facts-pending-attestations-discarded`: nothing is held and no edge was lost, because an unconfirmed attestation never entered any file's references — call `status` and carry on.

**After a judgement discard, the block moves rather than ends.** Those files come back from `status` in `data.awaitingComparison` under `facts-judgements-discarded`, and they stay `uncertain` until one thing clears them: a `compare` whose candidate could not simply reproduce what the lost judgements already decided.

- The candidate must not come from the tool that wrote the stored record. Each item names that tool as `storedTool`; extract with a program declaring a different `provenance.tool`, or read the file yourself and submit an attested candidate. A same-tool candidate is refused with `facts-comparison-not-independent` and clears nothing. Where the bundled extractor is the only program available, it always declares the same tool, so the attested reading is the way through — which is what the response's next action offers as its second branch.
- The comparison must measure against the store: call it **without** `generationId`. A discard takes from the store after a generation was frozen, so a frozen baseline cannot see the loss; that call is recorded as usual but leaves the mark, and says so with `facts-comparison-not-against-store`.

A file has two refusals it can meet here and never both at once. Either way the response's `nextAction` is the contract. The comparison itself reopens every edge the store does not carry as an item to judge in step 5: a lost `dismiss` costs nothing, since the edge stays where it was, but a lost `adopt` is only found again this way.

### 8. Finish

The bootstrap is complete when every in-scope file is `exact` or `tool-error`, and `rejected`, `unadjudicated`, `awaitingComparison`, `pendingAttestations` and `indeterminate` are all empty. Call `status` again after each step that changed state; when anything else remains, return to the step that owns it. Never repeat the same call with the same input: a step whose next call would be identical to its last one cannot finish, and the failure section applies.

## If the bootstrap cannot finish

Analysis reads these facts, so an unfinished bootstrap is not free: every judgment that rests on a dependency reference is `indeterminate` until the files it needs are settled. Record one line — `facts bootstrap incomplete: <step> <code or reason>` — and then follow the calling skill's rule:

| Calling skill                  | What an unfinished bootstrap means there                                                                                                                                                                                                                                                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scan`, `guide`                | `fractal_inspect` refuses nothing. It returns the unsettled files as `unknownFiles`, each with its causes, and every reference-based axis over them comes back `indeterminate` carrying its own `nextAction`. Report the line and continue; nothing here converts an `indeterminate` into a pass.                                                     |
| `restructure`                  | `plan` is `indeterminate` when an unsettled file is relevant to the moves; `postcondition` is `indeterminate` when the project holds any unsettled file at all, because "no new cycle" and "no new boundary violation" are claims of absence. Both name the files, and the `nextAction` is their facts — bootstrap those and call the same action again, not a new plan. |
| `cross-review`                 | `prepare` refuses with `facts-incomplete`. Its message groups the files by cause and its `nextAction` names what each list needs — re-extracting answers `missing` and `needsResolution`, and nothing else. Run this bootstrap that way and call `prepare` again. A second `facts-incomplete` over the same files in the same groups is the same refusal: end without a terminal verdict and record it in the report as a filid defect. One naming different files, or the same files under a different cause, is progress — act on it. |
| `pull-request`                 | `handoff` shares that gate but does not refuse: the call returns `ok` with `documentSync: failed`, and carries the gate's own `facts-incomplete` diagnostic — code, message and `nextAction` — in its response `diagnostics`. Read it by code, run this bootstrap, and call `handoff` once more so the PR body carries a real sync rather than a failed one. Stage 3 runs the bootstrap before the call for the same reason. |
| `revalidate`                   | It has no gate of its own, by design — `checkpoint` reads no reference-based evidence. Its re-measurements are `fractal_inspect validate` calls, so an unsettled file leaves that rule's evidence `indeterminate` and the accepted item stays `inconclusive`; a verdict standing on `inconclusive` items is never `PASS`. When the corrections need a fresh review instead, the chain is `checkpoint`/`seal` `review-source-hash-stale` → `prepare` → `facts-incomplete` → this bootstrap → `prepare` → `seal`, and the refusal is `prepare`'s, not `revalidate`'s. |
| `pipeline`                     | The refusal reaches it as the result of the stage that raised it. When that stage's `nextAction` is this bootstrap, or an `adjudicate` the agent can carry out, perform it and re-run that stage once. A refusal that repeats — same code, same next action, same subject — ends the cycle with a report; one that comes back asking for something else, or about something else, is progress.                                                                                    |

A step that cannot finish never repeats its own last call: a call identical to one already made cannot make progress, and that is what ends the loop. Judge "again" by what the refusal asks, not by how often one has arrived — the same `code` with the same `nextAction` over the same files is the same refusal, while the same code carrying a different next action, or naming different files, is the work moving. A bounded retry followed by a report is the designed ending of these rows, not a question for a person.
