# restructure — Reference Documentation



Detailed plan, approval, external execution, and postcondition contract for [SKILL.md](./SKILL.md).

## Section 1 — Placement Requests

Each request maps directly to the public `RestructurePlanInput` contract:

```text
{
  action: "plan",
  path: "<project-path>",
  requests: [{
    sourcePath: "<existing-unit-path>",
    consumerPaths?: ["<consumer-path>", "..."],
    contractIntent?: "independent" | "internal" | "unknown",
    organNameHint?: "<name-hint>"
  }]
}
```

Use placement requests explicitly supplied by the user or copied from a previous Filid finding. Do not infer an `independent` or `internal` contract from a name. Omitted `consumerPaths` are resolved by the snapshot dependency graph, which counts every importer — including code that only constructs the unit and hands it on. When such wiring is among the importers, pass `consumerPaths` naming only the owners that use the unit; left in, wiring lifts the unit to the composition root.

Call:

```text
mcp__filid__restructure(<RestructureInput>)
```

The tool is read-only. It returns a summary plus an artifact for the full plan regardless of plan size. The artifact stores a common `ToolPayload`; read its `.data` as the `RestructurePlan`. Verify that the artifact SHA-256 matches the envelope before using it.

The plan contains exact `sourcePath -> targetPath` moves, target node type, placement basis, consumers, lowest common fractal path, required artifacts, import requirements (`affectedImports`, `preservedImports`), `alreadyPlaced` entries, and unresolved decisions. A non-`ok` status or a non-empty `unresolved` list must be shown as unresolved and cannot be executed; the summary and each `decisions[]` entry name the fix in `nextAction`.

`moves` is listed in execution order. A `targetPath` is where the unit goes when its move runs; a later move whose source holds that path carries it along. Every `affectedImports` entry is `{ consumerPath, currentSpecifier, requiredResolvedPath, suggestedSpecifier? }` in final paths: the consumer's path and the file its import must load after all moves ran. An import whose importing or imported file moves appears in exactly one move, whoever the consumer is — explicit `consumerPaths` only steer placement. `move-order-conflict` marks moves no order can satisfy; its `decisions` entry names the cause and the moves involved. `suggestedSpecifier` appears only when the current specifier names the file or its directory; for other imports (directory-index references, bare `.` or `..`) you write the specifier. It is a suggestion: postcondition checks only where the import resolves. `preservedImports` have the same shape without a suggestion, keep resolving, and need no edit; postcondition still checks them. Both kinds pass when some import of the consumer loads `requiredResolvedPath` and every import still written as `currentSpecifier` loads that file or another file the plan requires of the same consumer — naming the index file explicitly is fine.

`alreadyPlaced` holds requests whose computed target equals their current path. They carry the same computed evidence as a move but nothing to execute and no import requirements, so they are excluded from `moves`. Postcondition validation still requires each one at its final path — a directory move may carry it — but not the absence of its source, which would demand that one path be both absent and present. `summary` counts them under `alreadyPlacedCount`, separate from `moveCount`.

## Section 2 — Precondition Validation

Before presenting a plan for approval, call:

```text
mcp__filid__restructure({
  action: "precondition",
  path: "<project-path>",
  planPath: "<absolute-plan-artifact-path>"
})
```

Read the validation data from the returned result or, when the payload exceeds the inline envelope budget, from its artifact.

The plan is executable only when the response status is `ok` and its validation data is valid. A change to what the plan read — a file whose bytes it read (a move source, its consumers, or the files it imports), or the state of a path that decided placement (anything now occupying a target path, or an `INTENT.md` or `DETAIL.md` created, changed, or removed in a directory above a source or target) — missing source, invalid artifact, or unresolved decision returns to planning as each finding's `nextAction` says; never work around it with an ad-hoc move.

## Section 3 — Approval

Display each exact move and its:

- Current path
- Target path
- target Type
- placement Basis and LCA
- required INTENT/DETAIL/entry-point artifacts
- import requirements, including those without a suggestedSpecifier whose specifier you will write

Also display the plan ID, snapshot hash, precondition result, and total affected files. `--dry-run` prints this material and ends without changes.

Without `--auto-approve`, require explicit approval of this exact plan. `--auto-approve` is prior authorization for the exact validated artifact; it does not authorize unresolved decisions or a changed plan.

## Section 4 — External Execution

Filid MCP never moves files and never rewrites imports. After approval, the calling environment performs ordinary file operations outside MCP:

1. Update the affected fractal DETAIL.md contracts before code or moves.
2. Update INTENT.md before changing a public boundary.
3. Create the `requiredArtifacts` of every `alreadyPlaced` entry.
4. Run `moves` in listed order: move each exact `sourcePath` to its `targetPath`, then create that move's `requiredArtifacts` at their listed paths. Never reorder moves — a later move may carry earlier ones along or move into a path an earlier one vacated, and creating a target directory early makes a later directory move nest inside it.
5. After the last move, change only the listed `affectedImports` so each loads its `requiredResolvedPath`: use `suggestedSpecifier` when present, otherwise write a relative path-like specifier in the file's extension style. Leave `preservedImports` as they are. All paths describe the final layout.

Use the environment's cross-platform path/file helpers. Do not construct paths by splitting on `/` or `\`. Preserve unrelated working-tree changes and stop on a partial operation instead of silently inventing a recovery plan.

Record which plan instruction produced each filesystem change. The skill does not expose generic move or import-rewrite capability through MCP.

## Section 5 — Postcondition Validation

Call the same validator against the same artifact after all approved external operations:

```text
mcp__filid__restructure({
  action: "postcondition",
  path: "<project-path>",
  planPath: "<absolute-plan-artifact-path>"
})
```

Read the postcondition results from the returned result or, when the payload exceeds the inline envelope budget, from its artifact. Treating an absent inline `data` as "nothing failed" would turn a failed move into a false pass.

Success requires `status: "ok"` and valid postconditions for source absence, target presence, required artifacts, imports, boundary rules, and dependency DAG. Fix each finding by its `nextAction` and validate again. Do not substitute a project-mode validation for this exact-plan check.

## Section 6 — Report

Report the plan ID/hash, artifact path/hash, approval mode, each executed move, required documents and entry points, import requirements with the specifiers written, and pre/post validation outcomes. A failed postcondition is a failed restructure, even when file operations completed.

End a successful execution with:

```text
Restructure complete: <N> moves applied
```

End a dry run with:

```text
Restructure dry-run complete
```
