# Knowledge: Immutable Object Policy

## Definition

Immutable objects are tokens in user input that must be preserved **exactly** as provided — no modification, translation, reformatting, or removal.

These tokens function as **reserved keywords** or **strict string literals**. They are passed through to downstream systems where any alteration causes failures.

## Token Categories

| Category | Pattern | Examples |
|----------|---------|----------|
| **Slash Commands** | `/command-name` | `/pr`, `/edit`, `/review`, `/commit`, `/deploy` |
| **File Paths** | Relative or absolute paths | `./src/main.ts`, `../config/`, `/usr/local/bin` |
| **URLs & Links** | `http://` or `https://` | `https://api.example.com/v2` |
| **Media References** | Attached files or IDs | Image attachments, file upload references |
| **Code Identifiers** | Backtick-wrapped tokens | `` `functionName` ``, `` `ClassName` `` |
| **Environment Variables** | `$VAR` or `${VAR}` | `$HOME`, `${API_KEY}` |
| **CLI Flags** | `--flag` or `-f` | `--verbose`, `-o output.json` |

## Handling Rules

1. **Detection:** Scan user input for all tokens matching the patterns above during Phase 1 analysis.
2. **Cataloging:** List all detected immutable objects in the analysis output.
3. **Preservation:** Copy tokens character-for-character into the final generated prompt.
4. **No Translation:** Even if the surrounding text changes language, immutable objects stay in their original form.
5. **No Reformatting:** Do not change casing, add/remove quotes, expand abbreviations, or normalize paths.
6. **Contextual Placement:** Place tokens in the same logical context as the original input (e.g., a file path referenced as input stays as input, not moved to output).

## Verification Checklist

Before finalizing output, verify:

- [ ] Every slash command from input appears in output unchanged
- [ ] Every file path from input appears in output unchanged
- [ ] Every URL from input appears in output unchanged
- [ ] Every media reference from input is acknowledged
- [ ] No token has been translated, reformatted, or omitted
