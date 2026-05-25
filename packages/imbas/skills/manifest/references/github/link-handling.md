# GitHub Provider — Link Handling (Bidirectional)

Documents the `## Links` section write protocol for the manifest skill.
See `SPEC-provider-github.md §1.2` for the data contract.

## `## Links` section grammar

The `## Links` section lives in the GitHub issue body at h2 level:

```markdown
## Links

- blocks: #123
- blocks: owner/repo#45
- blocked-by: #7
- split-from: #2
- split-into: #8, #9
- relates: #12, #14
```

Parser rules (also governs writes):
- Header is literal `## Links` (h2). Missing section → `{}`.
- Each line: `- <linkType>: <refList>`.
- `linkType` ∈ `{blocks, blocked-by, split-from, split-into, relates}` (matches `config.github.linkTypes` default).
- `refList`: comma-separated list of `#N` or `owner/repo#N`.
- Empty section (header present, no items): valid, yields `{}`.
- Duplicate `linkType` keys: merged (union of refs).
- Unknown `linkType`: parse warning (forward-compat), not an error.

## Bidirectional mapping

When source A records link type X pointing to B, target B records the reverse:

| Source type (A → B) | Reverse type (B → A) |
|---------------------|----------------------|
| `blocks`            | `blocked-by`         |
| `blocked-by`        | `blocks`             |
| `split-from`        | `split-into`         |
| `split-into`        | `split-from`         |
| `relates`           | `relates`            |

`relates` is symmetric — both sides use the same type string.

## Write protocol

For each link operation:

1. Read current body of source issue:
   ```bash
   gh issue view <N> --repo <owner/repo> --json body
   ```
2. Parse the `## Links` section. If absent, append it.
3. Append `- <linkType>: <target_ref>` under `## Links`.
4. PATCH source body:
   ```bash
   gh api repos/<owner/repo>/issues/<N> --method PATCH -f body="<updated body>"
   ```
5. Read current body of target issue (same `gh issue view`).
6. Append `- <reverseType>: <source_ref>` under target's `## Links`.
7. PATCH target body.
8. If either PATCH fails, report the failure but do NOT roll back the other side.
   A future `imbas:repair-links` operation handles asymmetric state.

## Task-list hierarchy maintenance

Creating a child issue (Story under Epic, Task under Story, Subtask under Task)
requires updating the parent body's `## Sub-tasks` section.

Protocol:
1. Read parent body.
2. Locate the `## Sub-tasks` section. If absent, append it before `## Links`.
3. Append `- [ ] #<child_number>` as a new line item.
4. PATCH parent body via `gh api`.

### Transaction semantics

If the parent PATCH fails after the child issue was already created:
- Report the failure to the user.
- Do NOT roll back the child issue (it is a valid standalone issue).
- Record the parent PATCH failure in the manifest item for the child.
- A future `imbas:repair-links` run will detect and fix the missing task-list entry.

## Idempotency

Before appending any link entry, check for an exact match of
`- <linkType>: <ref>` in the existing `## Links` block.
If already present, skip the append. Re-execution is safe.

## 1:N expansion

The manifest link schema allows `link.to` to be an array. For each target,
repeat the write protocol independently. Per-target outcomes feed into the
manifest link status: `created` / `partial` / `failed`.
Successful targets are NOT rolled back if a later target fails.
