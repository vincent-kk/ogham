# fca-config — Reference

Detailed specifications for config path resolution, output formatting,
and validation logic.

## Schema Source

The authoritative config schema is the `FilidConfig` interface in
`src/core/infra/config-loader.ts`:

```
Read src/core/infra/config-loader.ts and locate the FilidConfig interface
to discover all available top-level fields and their types.
```

Do NOT hardcode field lists in this skill. Always read the interface
definition dynamically to support future schema extensions.

## Dot-Notation Path Resolution

The `set` subcommand supports dot-notation paths to modify nested values.

### Algorithm

```
Input: path = "rules.naming-convention.enabled", value = "false"

1. Split path by '.' → segments = ["rules", "naming-convention", "enabled"]
2. Start at config root object
3. For each segment except the last:
   a. If the key exists and is an object, descend into it
   b. If the key does not exist, create an empty object and descend
   c. If the key exists but is NOT an object, report error:
      "Cannot traverse into non-object value at '<partial_path>'"
4. Set the final segment's value with type coercion applied
```

### Type Coercion Rules

| Input string | Coerced type | Coerced value |
|---|---|---|
| `"true"` | boolean | `true` |
| `"false"` | boolean | `false` |
| `"123"` or `"3.14"` | number | `123` or `3.14` |
| `"null"` | null | `null` (removes the key) |
| anything else | string | as-is |

### Examples

| Command | Path segments | Target | Result |
|---|---|---|---|
| `set language ko` | `["language"]` | root.language | `"ko"` |
| `set rules.naming-convention.enabled false` | `["rules","naming-convention","enabled"]` | root.rules["naming-convention"].enabled | `false` |
| `set rules.max-depth.severity warning` | `["rules","max-depth","severity"]` | root.rules["max-depth"].severity | `"warning"` |

## Output Format — `show` Subcommand

Display config as a structured markdown table:

```markdown
## .filid/config.json

| Key | Value |
|-----|-------|
| version | 1.0 |
| language | ko |

### Rules

| Rule | Enabled | Severity |
|------|---------|----------|
| naming-convention | ✓ | warning |
| organ-no-intentmd | ✓ | error |
| index-barrel-pattern | ✓ | warning |
| module-entry-point | ✓ | warning |
| max-depth | ✓ | error |
| circular-dependency | ✓ | error |
| pure-function-isolation | ✓ | error |
| zero-peer-file | ✓ | warning |
```

Notes:
- `✓` for enabled, `✗` for disabled
- If `language` is not set, show `(default: en)` as the value
- Any additional top-level fields should be shown in the first table

## Output Format — `set` Subcommand

After a successful set operation:

```
✓ Set `language` = `ko`

Current config:
<show format output>
```

After a failed set operation:

```
✗ Failed to set `<key>`: <reason>
```

## Output Format — `reset` Subcommand

```
✓ Config reset to defaults.
  Language preserved: ko

Current config:
<show format output>
```

Or with `--full`:

```
✓ Config fully reset to defaults.

Current config:
<show format output>
```

## Validation Rules

After any write operation, verify:

1. **Valid JSON**: File parses without error
2. **Version exists**: `config.version` is a non-empty string
3. **Rules exist**: `config.rules` is an object with at least one entry
4. **Rule shape**: Each rule entry has `enabled` (boolean) and `severity` (string)
5. **Severity values**: Must be one of `"error"`, `"warning"`, `"info"`
6. **Language value**: If present, must be a non-empty string

Report validation failures inline after the operation output.

## Error Handling

| Scenario | Response |
|---|---|
| No `.filid/config.json` + `show` | "No config found. Run `/filid:fca-init` to initialize." |
| No `.filid/config.json` + `set` | Create default config, then apply the set operation |
| Invalid JSON in existing config | "Config file contains invalid JSON. Run `/filid:fca-config reset` to fix." |
| Invalid dot-path | "Invalid path: cannot traverse into non-object at `<segment>`" |
| Unknown top-level key | Warn but allow: "Note: `<key>` is not a known FilidConfig field. Set anyway." |
