# filid-revalidate — DETAIL

## Requirements

- Each Delta fix item MUST be (a) written to `verification-ledger.md` by the
  Step 3 subagent with a row containing literal `TBD` tokens in both
  `post_count` and `status`, and (b) re-derived by the Step 6 main
  orchestrator via an independent `mcp_t_structure_validate` call before
  the PASS/FAIL verdict is rendered.
- The Step 6 main orchestrator MUST:
  - detect tampering when `post_count != "TBD"` OR `status != "TBD"` on
    any subagent-authored row, log a warning, and discard the tampered
    values before re-derivation;
  - detect missing rows (`ledger rows < accepted fix count`) and mark the
    absent fix entries as auto-`UNRESOLVED`;
  - derive `post_count` from the returned violation set filtered by
    `ruleId == <target rule>` and `path starts with <target_path>`;
  - derive `status` from the triple
    `(pre_count, post_count, file_was_modified)` using the matrix below.
- If any derived row has `status == "UNRESOLVED"`, the verdict MUST be
  pinned to `FAIL` — subagent judgements cannot override this.
- Step 8 cleanup MUST remove `verification-ledger.md` along with the rest
  of the session directory only when the final verdict is `PASS`.

## API Contracts

### Writer Responsibility

| Role              | Writes                       | Must write         | Must NOT write           |
| ----------------- | ---------------------------- | ------------------ | ------------------------ |
| Step 3 subagent   | `verification-ledger.md` row | `post_count: TBD`, `status: TBD`, `pre_count`, `target_path`, `rule_id`, `file_was_modified` | numeric `post_count`, `RESOLVED`, `UNRESOLVED` |
| Step 6 main       | Same row, overwrite          | derived `post_count` (number), derived `status` | anything that overrides a prior main-derived row |

### status derivation

| pre_count | post_count | file_was_modified | derived status   |
| --------- | ---------- | ----------------- | ---------------- |
| > 0       | 0          | true              | `RESOLVED`       |
| > 0       | > 0        | true              | `UNRESOLVED`     |
| > 0       | > 0        | false             | `UNRESOLVED`     |
| > 0       | 0          | false             | `UNRESOLVED` (file-diff insufficient) |
| 0         | 0          | any               | `RESOLVED` (vacuous) |

### parse-fail gate

If the ledger cannot be parsed (missing file, malformed row, unexpected
column count) → verdict pinned to `FAIL` with `reason: verification-ledger.md parse failed`.

## Last Updated

2026-04-24 — v0.4.0 Writer Responsibility contract introduced (plan §3 row E, §4 P4).
