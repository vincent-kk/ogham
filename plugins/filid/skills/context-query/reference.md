# context-query — Minimal Context Reference

## Section 1 — Parse the Question

Extract:

- the project path, defaulting to the current working directory
- a target file or directory path
- whether the question concerns ownership, boundaries, public contract, or placement context

If no target path can be derived, ask for one concise path. Do not substitute a whole-project search for an unresolved target.

## Section 2 — Resolve Ownership and Document Chain

Call exactly once:

```text
mcp__plugin_filid_tools__fractal_inspect({
  action: "resolve",
  path: "<project-path>",
  requests: [{ targetPath: "<target-path>" }]
})
```

Read `data.results[0]`; when `data` moved to an artifact, read the same first result there. A resolved result identifies:

- the normalized target
- the nearest owner fractal
- the owner-to-root document-reference chain
- the nearest DETAIL.md
- the configured output language

The tool returns document references, not document bodies. It also excludes sibling and cousin subtrees by contract.

An unresolved first result, an ownerless target, a target outside the project, a non-OK item status, or item diagnostics is not a successful resolution. Report the stable diagnostic instead of guessing ownership.

## Section 3 — Read the Minimum Evidence

Read only the referenced documents needed for the question:

- boundary question: INTENT.md from owner toward root until the applicable rule is found
- public-contract question: nearest DETAIL.md, plus owner INTENT.md when its boundary constrains the answer
- ownership question: the resolution summary is normally sufficient
- placement-context question: owner and parent INTENT.md, plus nearest DETAIL.md when public ownership matters

Do not read every document in the returned chain by default. Never load sibling documents to enrich a focused answer.

## Section 4 — Three-Round Budget

| Round | Work                                                           |
| ----- | -------------------------------------------------------------- |
| 1     | Parse the question and call `fractal_inspect` action `resolve` |
| 2     | Read the minimum referenced documents                          |
| 3     | Answer with evidence paths and certainty                       |

If the required evidence cannot fit this budget, state what is known and list the unresolved referenced paths. Do not add a broad scan.

## Section 5 — Response Shape

```text
Owner: <fractal path>
Contract: <nearest DETAIL path or "none">
Applicable chain: <paths actually read>

<direct answer>

Certainty: exact | indeterminate
Diagnostics: <none or stable codes/messages>
```

Answer in `data.results[0].summary.outputLanguage` (or its artifact equivalent). Cite file paths for every boundary or contract claim.
