# rule — Reference

Detailed workflow, examples, and error handling for the rule skill.

## Detailed Workflow

### Step 1 — Display Current Rules

Scan `.claude/rules/` and display all registered rules:

```
Current registered rules:

  [Global] general.md — applies to all files
    └ "Write commit messages in English", "Respond in Korean"

  [Conditional] api-security.md — src/api/**/*.ts, src/api/**/*.tsx
    └ "Mandatory input validation", "No sensitive data logging"

Total: 2 rule files
```

If empty: prompt to create the first rule.

### Step 2 — Identify Intent

Present options or detect intent from natural language:

| User Expression | Action |
|----------------|--------|
| "No console.log in API files" | Create conditional rule |
| "Always write tests first" | Create global rule |
| "Delete the api-security rule" | Remove rule |
| "Show me all rules" | List rules |

### Step 3 — Define Rule Content and Scope

Collect rule content and determine scope:

- **Global**: No `paths` frontmatter — applies unconditionally
- **Conditional**: `paths` frontmatter with glob patterns — applies only to matching files

### Step 4 — Create or Modify Rule File

After user confirmation, write the rule file.

**Conditional rule** (`api-security.md`):
```markdown
---
paths:
  - "src/api/**/*.ts"
  - "src/api/**/*.tsx"
---
# API Security Rules

- Mandatory input validation for all API endpoints
- Never log sensitive data (passwords, tokens, PII)
- Always use parameterized queries for SQL
```

**Global rule** (`general.md`, no paths):
```markdown
# General Rules

- Respond in Korean
- Write commit messages in English (type: subject format)
- Read file content before modifying
```

When appending to existing files: show diff preview and confirm.

### Step 5 — Confirmation

Report the created/modified rule with file path, scope, and entry count.

## Glob Pattern Reference

| Pattern | Target |
|---------|--------|
| `**/*.ts` | All TypeScript files |
| `src/api/**/*.ts` | TypeScript under src/api/ |
| `*.{ts,tsx}` | Root-level ts/tsx files |
| `src/**/*` | All files under src/ |
| `**/*.test.ts` | All test files |

## Rules Spec

- **Location**: `{CWD}/.claude/rules/*.md` (recursive discovery, includes subdirectories)
- **paths frontmatter**: file-pattern-based conditional application
  - No `paths` → applies unconditionally to all files
  - With `paths` → applies only when working on matching files
- **Glob patterns**: `**/*.ts`, `src/**/*`, `*.{ts,tsx}`, etc.

## Agent Collaboration

Executed by the **configurator** agent. The configurator ensures spec compliance, creates backups before modifications, and validates glob patterns.

## Usage Examples

```
/maencof:rule add
/maencof:rule list
/maencof:rule edit api-security
/maencof:rule remove test-rules
/maencof:rule show general
```

Natural language:
```
"Add a rule: no console.log in production code"
"Show me all my rules"
```

## Error Handling

| Condition | Resolution |
|-----------|------------|
| `rules/` directory missing | Auto-create directory, then proceed |
| Invalid glob pattern | Show syntax guide with examples |
| Filename conflict | Display existing file, offer append or overwrite |
| Rule deletion | Preview content, require double confirmation |
| Pattern-content mismatch | Warn about relevance, confirm before proceeding |

## Acceptance Criteria

- Rule file exists at `{CWD}/.claude/rules/{name}.md`
- Correct `paths` frontmatter for conditional rules (absent for global)
- Valid glob patterns in `paths` array
- User confirmation received before any file write
