# Facts Bootstrap

Canonical procedure for every filid skill whose judgments read dependency references. Each such skill links here from one short step placed before its first reference-based analysis call; the steps live only in this file.

Run the steps in order, in the same turn as the calling skill, and return to the calling skill's next step when step 7 or the failure section ends the bootstrap. `PROJECT_ROOT` is the absolute project root the calling skill analyses.

## Tool use

- If the `facts` schema is absent, call `ToolSearch` once with `select:mcp__plugin_filid_tools__facts`.
- The extractor runs in step 2 are the only Bash calls this procedure makes, and each runs the extractor alone: it creates its output file with `mktemp`, runs the extractor, and prints only that file's path. Pass the path to `submit`; never print or read the output file. Never run git.
- Never write project configuration here. Declaring scope edits `.filid/config.json`, which dirties the worktree a review is judging.
- When a step needs the agent to read a source file itself (steps 3 and 4), read it with the Read tool, not Bash.

## Steps

### 1. Read the status

```text
mcp__plugin_filid_tools__facts({ action: "status", path: PROJECT_ROOT })
```

`summary` carries `projectState`, `resolutionEpoch`, `scopeSource`, `extractionList` and `attestationRequirement`; keep those. `data` carries the lists: `missing`, `needsResolution`, `uncertain`, `toolError` and `indeterminate` are each `{ paths, truncated }`; `rejected` is `{ items, truncated }` where each item names its own `path`, `code` and `nextAction` (plus `specifier`, `inputPath` or `lines` where filid can name them); `unadjudicated` is `{ items, truncated }`; `pendingAttestations` is a list of `{ path, actor, contentHash, nextAction }`.

A response's own `nextAction` and `attestationRequirement` are the contract. Where this document and a response differ, the response wins.

An `uncertain` file always appears in at least one of four reason lists — `rejected`, `unadjudicated`, `pendingAttestations`, `indeterminate` — so route by those four rather than by `uncertain` itself:

- `rejected` → step 4, item by item.
- `unadjudicated` → step 5.
- `pendingAttestations` → step 6.
- `indeterminate` → the provider could not vouch for a reference in that file; it needs an attested record, so it goes to step 6 too.

When a list's `truncated` is above zero the server left entries out of it: handle the ones it returned, then call `status` again for the rest.

- `scopeSource: "default"` means the project declared no `facts.covers`, so the scope is the adapters' source extensions. That is a working scope, not a missing one: continue. A report that says what was analysed says this too.
- `projectState: "facts-uninitialized"` means the scope in effect covers no file at all. Outside a review, follow the diagnostic: set `facts.covers` in the project's `.filid/config.json`, then call `status` again. Inside a review, do not edit config — record the diagnostic and follow the calling skill's rule for an incomplete bootstrap.
- Otherwise continue with the first later step whose list is non-empty; when every list is empty, go to step 7.

### 2. Extract and submit (`missing`, `needsResolution`)

The server owns the scope. `extractionList.path` names a file it wrote holding the paths to extract, and `extractionList.count` how many; the agent passes that path straight through and never reads or edits it. `extractionList.unrepresentable` counts in-scope files whose names a line-oriented list cannot carry — they are absent from the list and stay `missing`; report that number rather than trying to extract them.

Run the bundled extractor in one Bash call that creates a unique output file and prints only its path:

```text
FACTS_OUT=$(mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX") && node "${CLAUDE_PLUGIN_ROOT}/bridge/filid-facts.mjs" --root PROJECT_ROOT --files-from EXTRACTION_LIST_PATH --out "$FACTS_OUT" > /dev/null && echo "$FACTS_OUT"
```

- Keep the printed path as `FACTS_OUT`. Every run creates its own file, so extractions by other sessions or projects sharing the directory never overwrite it.
- The output must lie outside the project tree: the server refuses a submission from inside it, and a file there joins the scanned path list and moves the epoch by itself.
- If `CLAUDE_PLUGIN_ROOT` is not set, locate the extractor with `Glob(**/bridge/filid-facts.mjs)`.
- To extract a subset — one file the calling skill cares about, or one part of a split submission — pass those project-relative paths as positional arguments, or pipe them to `--files-from -`, in the same shape of call.

Submit the output file with the epoch from step 1:

```text
mcp__plugin_filid_tools__facts({ action: "submit", path: PROJECT_ROOT, file: FACTS_OUT, resolutionEpoch })
```

An accepted submission replaces each submitted file's record. Whole-call refusals go to step 3; per-record and per-reference entries in `rejected` go to step 4.

### 3. Recover a refused submission

- `facts-epoch-moved` — the path list or a resolution input changed; `added` and `removed` name the cause. Take the new `resolutionEpoch` from the response, call `status` again for a current `extractionList`, and extract again from step 2.
- `facts-tree-unstable` — the epoch kept moving across repeated extractions. Outside a review, delete the files the response names, add them to `.gitignore` or `facts.excludes`, or stop the process writing into the tree, then return to step 1; inside a review, change nothing in the project — record the diagnostic and follow the calling skill's rule for an incomplete bootstrap.
- `facts-file-too-large` — split the submission without reading the list. Run the extractor once per share over the same `extractionList.path`, adding `--part <i>/<n>`: `--part 1/2` and `--part 2/2` cover the list between them and overlap in nothing. Each run makes its own output — `FACTS_PART=$(mktemp "${TMPDIR:-/tmp}/filid-facts.XXXXXX")`, then `--files-from EXTRACTION_LIST_PATH --part <i>/<n> --out "$FACTS_PART" > /dev/null` and `echo "$FACTS_PART"` in the same call — and each printed path is submitted with the same `resolutionEpoch`. Raise `n` while a part is still too large. Each call replaces only the records it carries.
- `facts-record-changed` or `facts-side-table-changed` — another writer replaced a record or took the side-table page first. Return to step 1.
- `facts-file-path-not-absolute`, `facts-file-inside-project`, `facts-file-not-regular`, `facts-file-unreadable`, `facts-file-not-json` — the submission file itself was wrong. Re-run the extractor into a fresh `mktemp` path outside the project and submit that.

### 4. Act on each rejected claim (`rejected`)

`data.rejected.items` names each refused claim with its `path`, its `code` and the one `nextAction` that changes it, and — where filid can name them — the `specifier`, the `inputPath` or the `lines` to read. Act from the item: its `nextAction` is the contract, and what follows only says which family of action it belongs to.

- Codes about moved bytes (`facts-content-hash-mismatch`, `facts-resolution-input-stale`) are fixed by extracting that path again as step 2 does and submitting it.
- Codes a re-extraction only reproduces — the server cannot read something (`facts-resolution-input-unreadable`, `facts-source-file-unreadable`), or the record's content is what the extractor got wrong (`facts-record-schema-invalid`, `facts-reference-absent`, `facts-resolved-path-invalid`, `facts-exported-name-absent`) — are not re-extracted. Follow the item's `nextAction`: submit the file again from another tool, or, where the item says the file needs one, as an attested record (step 6). Changes the item asks for in the project itself — permissions, `facts.excludes`, deleting a declared input — belong outside a review; inside a review, change nothing, record the item and follow the calling skill's rule for an incomplete bootstrap.
- `facts-record-out-of-scope` and `facts-record-path-invalid` mean the path is not one this project covers: drop it from the batch.

A `toolError` caused by a real syntax error is fixed in the source outside a review; during a review it is a finding. A file whose tool cannot read it at all is attested instead (step 6).

### 5. Adjudicate open items (`unadjudicated`)

`data.unadjudicated.items` holds one entry per open item, and every value an `adjudicate` call needs is in it: `path`, `lines`, `kind`, `reference`, `resolvedPath`, `contentHash`, `state`, and `origin`. Read the lines the item names in that file, then decide it from those values alone — do not re-derive them, and do not call `compare` here; `compare` exists for a verifier checking an independent extraction against the store.

```text
mcp__plugin_filid_tools__facts({
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

- **First submission.** The agent that reads the file writes the record and submits it with its own `actor`: `submit({ action: "submit", path: PROJECT_ROOT, file: FACTS_OUT, resolutionEpoch, actor })`. It is stored as pending, so the file stays `uncertain`, and the response's `attested[]` entry says so. A record that leaves a matching line unexplained is refused instead, with the line numbers to read.
- **Confirmation.** Each entry of `data.pendingAttestations` names the `path`, the `actor` that must NOT confirm it, and the `contentHash` the confirmation has to read. Brief a separate subagent with the file and those values only — never with the pending record's content — and have it read the file itself and submit its own attested record under its own `actor`. Matching records store the record and the file leaves `uncertain`.
- **Disagreement.** A second answer that differs stores nothing and leaves the pending attestation as it was; the response names the lines that settle it. Read those lines and submit a record that settles them. If the two answers differ a second time, call `discard-pending({ action: "discard-pending", path: PROJECT_ROOT, sourcePaths })` for that file and record `facts bootstrap incomplete: step 6 attestation-mismatch` — do not send a third pair of readings, because a call identical to one already made cannot finish (step 7).
- A tool-tier submission that succeeds for the same file discards the pending attestation by itself; nothing extra is owed.

### 7. Finish

The bootstrap is complete when every in-scope file is `exact` or `tool-error`, and `rejected`, `unadjudicated`, `pendingAttestations` and `indeterminate` are all empty. Call `status` again after each step that changed state; when anything else remains, return to the step that owns it. Never repeat the same call with the same input: a step whose next call would be identical to its last one cannot finish, and the failure section applies.

## If the bootstrap cannot finish

At this stage the bootstrap is advisory: analysis does not read facts yet, so a skipped or incomplete bootstrap leaves every result unchanged. When a step cannot finish — the `facts` tool is not registered, the scope covers no file, the extractor is not found, or a step would repeat an identical call — record one line `facts bootstrap incomplete: <step> <code or reason>` in the calling skill's report and continue with the calling skill's next step in the same turn.
