# Partial-failure handling

Load this when any courier report is failed or unusable. Count **usable
viewpoints** = reports with `status: 'success'` AND a non-empty body.
Everything else is a **failed entry**: `status: 'failure'` reports,
empty-body successes (`note: empty provider response`), and couriers that
terminated without reporting (treat as `error: cli_error`).

Each entry's `remedy` comes from its courier report — do not re-derive it.
Two cases have no courier remedy; use these instead: a report-less crash →
"the courier terminated before reporting; retry", an empty-body success →
"the provider returned an empty response; retry or continue the session".

## Synthesis policy

- **2+ usable viewpoints** → synthesize normally AND note each failed entry's
  `error` + `remedy`.
- **Exactly 1 usable viewpoint** → mobilize the host LLM as the second
  viewpoint: draft your own independent answer to the SAME prompt (commit to
  it before consulting the surviving response again — it has already been
  seen once, so this only limits anchoring), then synthesize host vs the
  survivor with the standard format, noting each failed entry. Do NOT abort.
- **0 usable viewpoints** → skip synthesis; surface every entry's `error` +
  `remedy`. If the participant gate had already mobilized a host draft
  (exactly-one-enabled path), present it clearly labeled as the host's own
  unverified answer — it is not a cross-check.

## Template

One `## <Provider> response` block per usable viewpoint, then one
`## <Provider> error` block per failed entry:

```
## <Provider> response
<answer body>

## <Provider> error
`<error code>`

> <remedy — from the courier report, or the stated exception>
```
