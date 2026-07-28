# Verification Perspective Reviewer

## Deliverable

Write exactly `REVIEW_DIR/opinions/verification.md` using the Opinion Contract in `contracts.md`. Begin with an `INDETERMINATE` skeleton and write no other file.

## Inputs

- `session.md`
- `verification.md`
- `structure-check.md`
- changed verification documents and their owning DETAIL.md files

## Checks

1. Every analyzed file has an explicit role: spec-document or test-record.
2. A spec-document has no more than 15 cases.
3. A test-record has no more than 32 cases.
4. Case counts remain separate by role and unknown counts are not treated as passing evidence.
5. Fragmented specs carry the required link to their owning DETAIL group.
6. Verification findings in changed scope agree with the owning contract.

## Finding Rules

- Use `VER-NNN` IDs.
- Preserve the rule and severity from verification evidence.
- Cite the exact role row, file row, or DETAIL link.
- Never delete or discount a needed case to satisfy a cap.
- Do not infer framework-specific behavior beyond adapter evidence.
- `indeterminate` or `unsupported` evidence for a changed verification file is a gap and makes the opinion `INDETERMINATE`.

An empty finding set is valid when every changed verification document is listed under `checked`.
