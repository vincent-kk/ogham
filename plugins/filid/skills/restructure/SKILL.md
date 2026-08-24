---
name: restructure
user-invocable: true
description: 'Create a read-only FCA placement plan, obtain approval, execute it via external file operations, and verify exact postconditions. Use when a unit belongs at another fractal or misplacement is flagged.'
argument-hint: '[path] <placement requests> [--dry-run] [--auto-approve]'
version: '1.0.0'
complexity: complex
plugin: filid
---

# restructure — Plan, Approve, Execute, Verify

Move units to their FCA target locations through one persisted `restructure_plan`. Filid decides placement and validates the result; the calling environment owns all actual file moves and import edits.

## When to Use

- A `scan` finding identifies an incorrectly placed unit.
- Several consumers require a shared unit at their lowest common fractal.
- A boundary must move between organ and fractal ownership.
- An approved change needs exact `sourcePath -> targetPath` postconditions.

Use `enrich-docs` when only documents need improvement.

## Workflow

### 1. Create the read-only plan

Translate explicit placement requests into `RestructurePlanInput` and call `restructure_plan`. Read the persisted artifact's `.data`; verify its artifact hash. Stop when the envelope is non-`ok` or the plan contains unresolved moves.

A request whose computed target equals its current path arrives in `alreadyPlaced`, never in `moves`. Report it as already correctly placed, execute nothing for it, and do not treat it as a failure.

The MCP call calculates consumer placement, LCA, target node type, required artifacts, and import rewrites. It does not modify the project tree.

### 2. Validate preconditions

Call `structure_validate` with `mode: "plan-precondition"` and the absolute plan artifact path. Only an `ok`, valid response can proceed.

### 3. Present and approve

Show the plan ID/hash and every Current/Target/Type/Basis/LCA decision, artifact, and import rewrite. `--dry-run` ends here. Otherwise obtain approval unless `--auto-approve` explicitly authorized this exact validated artifact.

### 4. Execute outside MCP

The calling environment updates DETAIL.md and boundary-changing INTENT.md first, then creates required artifacts, moves exact source paths, and applies listed imports. Use cross-platform path/file helpers and preserve unrelated changes.

Filid MCP never moves a file and never rewrites an import. This skill does not turn those operations into a generic MCP capability.

### 5. Validate exact postconditions

Call `structure_validate` with `mode: "plan-postcondition"` and the same artifact. Source absence, target presence, required artifacts, imports, boundaries, and DAG must all pass. Report a postcondition failure as failure; do not silently replan.

## Options

| Option             | Default  | Meaning                                               |
| ------------------ | -------- | ----------------------------------------------------- |
| `path`             | cwd      | Project root supplied to the plan                     |
| placement requests | required | Source plus optional consumers/intent/name hint       |
| `--dry-run`        | off      | Show validated plan; perform no file operations       |
| `--auto-approve`   | off      | Prior approval for this exact validated plan artifact |

See [reference.md](./reference.md) for the request shape and report contract.

## Non-negotiable Rules

- `restructure_plan` is the only placement authority.
- Precondition and postcondition validation use the same plan artifact.
- No external operation begins before approval.
- Every filesystem change traces to a plan instruction.
- Non-exact or unresolved evidence is never treated as approval-ready.
