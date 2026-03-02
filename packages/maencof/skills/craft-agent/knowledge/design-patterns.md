# Subagent Design Patterns

Proven patterns and anti-patterns for building effective Claude Code subagents.

---

## Pattern 1: Single Responsibility Agent

**Principle**: Each subagent excels at one specific task.

### Good
```yaml
name: typescript-type-checker
description: Reviews TypeScript code specifically for type safety issues. Use after writing TypeScript.
tools: Read, Grep, Glob, Bash
model: sonnet
```

### Bad
```yaml
name: everything-agent
description: Reviews code, writes tests, deploys, manages database, and handles customer support.
tools: Read, Write, Edit, Bash, Grep, Glob, WebFetch, WebSearch, Task
```

**Why**: Focused agents produce better results. Claude can chain multiple focused agents for complex tasks.

---

## Pattern 2: Least Privilege

**Principle**: Grant only the tools necessary for the task.

### Good
```yaml
# Reviewer doesn't need to edit
name: code-reviewer
tools: Read, Grep, Glob, Bash
```

### Bad
```yaml
# Reviewer with write access is dangerous
name: code-reviewer
tools: Read, Write, Edit, Bash, Grep, Glob
```

**Why**: Prevents accidental modifications. Forces the agent to stay in its lane.

---

## Pattern 3: Descriptive Delegation Triggers

**Principle**: Write descriptions that help Claude decide when to delegate.

### Good
```yaml
description: "Security vulnerability scanner for Python applications. Use proactively when reviewing security-sensitive code, authentication flows, or data handling."
```

### Bad
```yaml
description: "Scans code for security stuff"
```

**Key elements**:
- What it does (specific domain)
- When to use it (trigger conditions)
- "Use proactively" (enables auto-delegation)

---

## Pattern 4: Structured Workflow Prompt

**Principle**: System prompts should define a clear numbered workflow.

### Good
```markdown
When invoked:
1. Run git diff to identify changed files
2. Scan each changed file for security issues
3. Check for OWASP Top 10 vulnerabilities
4. Verify input validation on boundaries
5. Report findings by severity

For each finding:
- Severity: Critical / High / Medium / Low
- Location: File and line number
- Description: What the vulnerability is
- Remediation: How to fix it
```

### Bad
```markdown
You are a security expert. Please review the code and find security issues. Be thorough and helpful.
```

**Why**: Structured prompts produce consistent, actionable output.

---

## Pattern 5: Context Isolation

**Principle**: Use subagents to keep verbose operations out of main context.

### Good Use Cases
- Running test suites (verbose output stays in subagent)
- Scanning large codebases (search results stay isolated)
- Processing log files (raw logs stay contained)
- Fetching documentation (full docs stay in subagent, summary returns)

### When NOT to Use Subagents
- Quick, targeted changes (overhead not worth it)
- Tasks needing iterative user feedback
- Tasks sharing significant context with main conversation

---

## Pattern 6: Defense in Depth

**Principle**: Combine tool restrictions with hooks and prompt instructions.

```yaml
name: db-reader
description: Read-only database queries for reporting.
tools: Bash
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-readonly.sh"
```

```markdown
You have read-only database access. Only execute SELECT queries.
If asked to modify data, explain that you only have read access.
```

Three layers of protection:
1. **Tool restriction**: Only Bash (no file modification)
2. **Hook validation**: Script blocks write SQL operations
3. **Prompt instruction**: Agent understands its limitations

---

## Pattern 7: Memory-Driven Learning

**Principle**: Use persistent memory for agents that benefit from cross-session knowledge.

```yaml
name: project-navigator
memory: project
```

```markdown
Before starting:
1. Check your agent memory for previously mapped codepaths
2. Review known architectural patterns from past sessions

After completing:
1. Update memory with new discoveries
2. Record key file locations and their purposes
3. Note architectural patterns and conventions

Your memory grows with each session, making you more effective over time.
```

**Best for**: Agents that repeatedly work with the same codebase.

---

## Pattern 8: Parallel Research

**Principle**: Spawn multiple focused subagents for independent investigations.

```
Research the authentication, database, and API modules in parallel using separate subagents
```

Each subagent explores independently, then results are synthesized.

**Requirements**:
- Investigations must be independent (no shared state)
- Each returns a focused summary
- Main context handles synthesis

**Warning**: Many subagents returning detailed results can consume main context.

---

## Pattern 9: Chained Subagents

**Principle**: Use sequential subagent invocation for multi-step workflows.

```
1. Use code-reviewer to find issues
2. Use debugger to fix critical issues
3. Use test-runner to verify fixes
```

Each agent completes before the next starts. Claude passes relevant context between them.

---

## Anti-Pattern: Kitchen Sink Agent

**Problem**: Agent with too many responsibilities and all tools.

**Symptoms**:
- Description mentions 5+ different tasks
- All tools enabled
- System prompt is 500+ lines
- Agent produces unfocused output

**Fix**: Split into multiple focused agents.

---

## Anti-Pattern: Vague Description

**Problem**: Description too generic for delegation decisions.

**Symptoms**:
- "Helps with code"
- "General purpose helper"
- Claude never auto-delegates to it

**Fix**: Be specific about domain, trigger conditions, and include "use proactively".

---

## Anti-Pattern: Bloated System Prompt

**Problem**: Prompt tries to cover every possible scenario.

**Symptoms**:
- Lists every programming language
- Includes generic best practices paragraphs
- Repeats obvious instructions
- 500+ words of general advice

**Fix**: Focus on one domain, define clear workflow, keep prompt under 200 words.

---

## Anti-Pattern: Over-Privileged Agent

**Problem**: Agent has more tool access than needed.

**Symptoms**:
- Read-only task with Write/Edit tools
- Analysis agent with Bash access when not needed
- Reviewer that can modify code

**Fix**: Start with zero tools, add only what's needed for each workflow step.

---

## Decision Matrix: Choosing the Right Pattern

| Scenario | Pattern | Template |
|----------|---------|----------|
| Code analysis without changes | Read-Only + Structured Workflow | `read-only-agent` |
| Bug fixing or implementation | Least Privilege + Structured Workflow | `full-capability-agent` |
| Specialized domain (data, security) | Single Responsibility + Model Selection | `domain-specialist` |
| Sensitive operations (DB, deploy) | Defense in Depth + Hooks | `hook-validated-agent` |
| Repeated codebase exploration | Memory-Driven Learning | Any + `memory: project` |
| Multi-area investigation | Parallel Research | Multiple focused agents |
| Multi-step workflows | Chained Subagents | Sequential invocation |
