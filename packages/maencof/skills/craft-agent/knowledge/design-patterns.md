# Subagent Design Patterns

Proven patterns and anti-patterns for building effective Claude Code subagents.

---

## Design Patterns

### Pattern 1: Single Responsibility

Each subagent does ONE thing well. Resist the urge to combine capabilities.

```
Good: "typescript-type-checker" — checks TypeScript type safety
Bad:  "code-quality-checker" — checks types, style, performance, security
```

Why: Focused agents produce deeper analysis. Broad agents produce shallow results.

### Pattern 2: Least Privilege

Grant only the tools needed for the task. Start minimal, add only when required.

```yaml
# Security reviewer — needs to READ, not WRITE
tools: Read, Grep, Glob

# NOT: tools: Read, Write, Edit, Bash, Grep, Glob
```

Why: Prevents accidental modifications. Reduces permission prompts. Limits blast radius.

### Pattern 3: Descriptive Delegation Triggers

The `description` field is how Claude decides to delegate. Make it specific.

```yaml
# Good — clear trigger condition
description: Reviews Python code for security vulnerabilities including SQL injection, XSS, and authentication bypass. Use proactively after writing Python files that handle user input.

# Bad — when would Claude ever delegate to this?
description: Helps with code review.
```

"Use proactively" tells Claude to delegate without being asked. Without it, delegation only happens on explicit user request.

### Pattern 4: Structured Workflow Prompt

System prompts with numbered steps produce more consistent results than free-form instructions.

```markdown
You are a database migration reviewer.

Review process:
1. Read the migration file
2. Check for reversibility — verify both up() and down() methods
3. Analyze data safety — flag destructive operations (DROP, TRUNCATE)
4. Verify index impact — check if new indexes affect query performance
5. Produce a structured report

Report format:
- Migration: [filename]
- Reversible: Yes/No
- Destructive operations: [list or "None"]
- Index changes: [list or "None"]
- Risk level: Low/Medium/High
- Recommendation: Approve/Request Changes
```

### Pattern 5: Context Isolation Awareness

Subagents receive ONLY their system prompt + task description. Design prompts that work without parent context.

```markdown
<!-- Good — self-contained instructions -->
You are a test coverage analyzer. When given a directory path,
scan all test files and produce a coverage report.

<!-- Bad — assumes parent context -->
Look at the file I was just editing and check if it has tests.
```

### Pattern 6: Defense in Depth

Combine tool restrictions with hooks for layered security.

```yaml
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly-sql.sh"
```

The `tools` field limits what's available. The hook validates HOW it's used. Together they enforce both "which tools" and "which operations."

### Pattern 7: Memory-Driven Learning

Enable `memory` for agents that improve through accumulated experience.

```yaml
memory: project
```

The agent builds knowledge across sessions: learned project conventions, discovered patterns, previously resolved issues. Useful for: code reviewers, debuggers, documentation writers.

### Pattern 8: Parallel Research

Spawn multiple read-only agents simultaneously for faster analysis.

```
Parent spawns in parallel:
  - security-reviewer → scans for vulnerabilities
  - performance-analyzer → scans for bottlenecks
  - dependency-checker → scans for outdated packages
```

All three run concurrently, each in its own context window. Parent aggregates results.

### Pattern 9: Model-Task Alignment

Match model to task complexity for cost and speed optimization.

```yaml
# Simple, repetitive scan → haiku (fast, cheap)
model: haiku

# Standard code review → sonnet (balanced)
model: sonnet

# Architecture analysis → opus (deep reasoning)
model: opus
effort: high
```

### Pattern 10: Perspective/Behavior Separation

An agent's system prompt defines WHO it is — perspective, judgment criteria, values. Reusable procedural workflows belong in skills injected via the `skills` field.

**Test:** If two agents with different roles would follow a procedure identically, extract it into a skill. If the instructions encode values, priorities, or judgment calls specific to this agent's role, keep them in the agent prompt.

```yaml
# Agent keeps: perspective, judgment, failure modes
---
name: code-reviewer
tools: Read, Grep, Glob
skills:
  - git-workflow
  - coding-standards
---
You are a senior code reviewer. Your judgment prioritizes correctness over style.

<judgment>
When correctness and convention conflict, flag the correctness issue.
Do not report style violations alongside logic bugs — it dilutes severity.
</judgment>

<failure-modes>
- Bikeshedding: Spending review time on naming while missing logic errors.
- Rubber-stamping: Approving without verifying file references.
</failure-modes>
```

```yaml
# Skill holds: reusable procedure (shared by code-reviewer, api-developer, etc.)
# skills/git-workflow/SKILL.md
Git commit workflow:
1. Stage only related files...
2. Write conventional commit message...
3. Run pre-commit hooks...
```

Why: Perspective makes each agent's judgment unique. Behavior is commodity — duplicating it across agents wastes context and creates maintenance drift. See `knowledge/persona-crafting.md` Section 6 for the full principle.

---

## Anti-Patterns

### The Kitchen Sink Agent

```yaml
tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, Agent, AskUserQuestion
```

Problem: too many tools = unfocused behavior, excessive permission prompts, unpredictable actions. Start with the minimum set.

### The Vague Description

```yaml
description: A helpful agent for various tasks.
```

Problem: Claude cannot determine when to delegate. The agent is never used, or used incorrectly.

### The Monolithic Prompt

```yaml
# Same git workflow duplicated in code-reviewer, api-developer, and test-runner
Git workflow:
1. Stage changed files...
2. Write conventional commit message...
```

Problem: reusable procedures embedded in agent prompts get duplicated across agents, waste context, and drift out of sync. Extract shared procedures into skills; keep only perspective in the agent prompt.

### The Bloated System Prompt

A 3000-word system prompt that covers every edge case. Claude spends tokens processing instructions instead of doing work.

Fix: keep prompts under 500 words. Move detailed references to skills injection or let the agent read reference files.

### The Over-Privileged Background Agent

```yaml
background: true
tools: Read, Write, Edit, Bash, AskUserQuestion
```

Problem: `AskUserQuestion` fails silently in background. `Bash` and `Write` auto-denied without pre-approval. The agent silently fails on most operations. Design background agents for autonomy with pre-approvable tools only.

---

## Decision Matrix

| Scenario | Template | Model | Key Tools |
| --- | --- | --- | --- |
| Code review / analysis | read-only-agent | sonnet | Read, Grep, Glob |
| Full implementation | full-capability-agent | sonnet/opus | Read, Write, Edit, Bash, Grep, Glob |
| Domain expertise | domain-specialist | sonnet | Domain-specific subset |
| Controlled access | hook-validated-agent | inherit | Bash + validation hooks |
| Background research | read-only-agent | haiku | Read, Grep, Glob + background: true |
| Deep architecture | full-capability-agent | opus | All tools + effort: high |
