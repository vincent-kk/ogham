# Local Provider — Link Handling (Bidirectional)

Transcribed from `.omc/plans/imbas-local-provider.md §3.5`. Single source of
truth; see also `SPEC-provider-local.md §3.5`.

## Invariant

Every link MUST be recorded on both sides. If A links to B, then both A's file
and B's file contain entries in their `links[]` arrays.

## Mapping table

When source A records `{type: X, to: B}`, target B records the reverse type:

| Source type (A → B)  | Reverse type (B → A)      |
|----------------------|---------------------------|
| `blocks`             | `is blocked by`           |
| `is blocked by`      | `blocks`                  |
| `is split into`      | `split from`              |
| `split from`         | `is split into`           |
| `relates to`         | `relates to`              |

`relates to` is symmetric — both sides use the same type string.

## Write protocol

For each link operation:

1. Identify source file path from source ID (prefix → type directory → filename).
2. Identify target file path from target ID likewise.
3. `Edit` source file's frontmatter `links:` YAML array, appending
   `{type: <source_type>, to: <target_id>}`.
4. `Edit` target file's frontmatter `links:` YAML array, appending
   `{type: <reverse_type>, to: <source_id>}` using the mapping table above.
5. If either Edit fails, report the failure but do NOT roll back the other side.
   The next `check-bidirectional-links.mjs` run will detect and can repair.

## Edit location within frontmatter

The `links:` key is inside the YAML frontmatter block (between the `---`
delimiters). Example target region:

```yaml
links:
  - type: blocks
    to: S-5
```

After append:

```yaml
links:
  - type: blocks
    to: S-5
  - type: is blocked by
    to: T-3
```

If `links:` is currently an empty array (`links: []`), replace with a non-empty
form. If the key is missing entirely, insert it before `created_at`.

## 1:N expansion

The manifest link schema allows `link.to` to be an array (`StoryLink.to: z.array(z.string())`).
For each target in the array, repeat the write protocol independently:

- Successful targets are NOT rolled back if a later target fails.
- Per-target outcomes feed into the manifest link status: `created` / `partial` / `failed`.

## Failure modes

- **Source written, target not written**: asymmetric link. Detected by
  `check-bidirectional-links.mjs`. Repair is a future `imbas:repair-links`
  operation (out of v1 scope); for now, log and continue.
- **Both sides already present**: idempotent — do not append a duplicate entry.
  Check for exact `{type, to}` match before appending.
- **Target file does not exist**: same as `ISSUE_NOT_FOUND` in `errors.md`.
  Abort the link, mark manifest link item `failed`, continue with next.
