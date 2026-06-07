# Persona Crafting for Subagents

Guide to writing effective system prompts that define a subagent's identity, behavior, and decision-making approach.

## Core Principle

A subagent's system prompt (the markdown body after YAML frontmatter) is its entire personality and instruction set. Claude receives this prompt plus the task description — nothing else from the parent conversation. The persona must be self-contained.

## Anatomy of an Effective Persona

### 1. Role Declaration

Open with a clear identity statement that establishes expertise and scope.

**Good:**
```
You are a security-focused code reviewer specializing in Node.js backend applications. Your expertise covers OWASP Top 10 vulnerabilities, authentication flows, and input validation patterns.
```

**Bad:**
```
You are a helpful assistant that reviews code.
```

**Why it matters:** Claude uses the role declaration to calibrate its response depth, terminology, and judgment thresholds. A vague role produces generic output.

### 2. Responsibility Boundaries

Define what the agent DOES and DOES NOT do. Explicit boundaries prevent scope creep and wasted tokens.

```
Your responsibilities:
- Identify SQL injection, XSS, and CSRF vulnerabilities
- Flag insecure authentication patterns
- Check for secrets/credentials in code

Out of scope:
- Performance optimization suggestions
- Code style or formatting feedback
- Architecture redesign proposals
```

### 3. Workflow Structure

Provide a numbered process the agent follows. This creates predictable, reproducible behavior.

```
When reviewing code:
1. Scan for hardcoded secrets and credentials
2. Analyze input validation at system boundaries
3. Check authentication and authorization flows
4. Review database query construction for injection
5. Examine output encoding for XSS prevention
6. Produce a structured report with severity ratings
```

### 4. Quality Standards and Output Format

Define what "done" looks like. Without explicit standards, output quality varies.

```
For each finding, provide:
- File path and line number
- Vulnerability type (CWE classification)
- Severity: Critical / High / Medium / Low
- Concrete fix with code example
- Reference to relevant OWASP guideline
```

### 5. Decision-Making Guidance

Tell the agent HOW to think, not just WHAT to do. This is what separates a useful subagent from a mechanical step-follower.

#### Value Priorities

Declare an explicit priority ordering so the agent can resolve ambiguous tradeoffs autonomously. Without this, Claude defaults to generic "balance all concerns" behavior.

```
Value priorities (in order):
1. Correctness — never sacrifice correctness for speed
2. Security — flag vulnerabilities even if fixing them delays delivery
3. Simplicity — prefer simple solutions over architecturally "correct" ones
4. Performance — optimize only when measurable impact exists
```

When two priorities conflict, the higher-ranked one wins. State this explicitly — Claude uses the ordering to make judgment calls without asking.

#### Circuit Breakers

Define when the agent should stop trying and escalate. Without this, agents can spin indefinitely on the wrong approach.

```
Escalation rules:
- After 3 failed fix attempts, question the approach rather than trying more variations
- If confidence in a finding drops below "likely", move it to Open Questions instead of reporting it as fact
- If a task requires modifying files outside the stated scope, stop and report the dependency
```

#### Failure Mode Catalog

Name the specific judgment failures the agent must avoid. Generic "be careful" instructions don't change behavior — concrete anti-patterns do.

```
<failure-modes>
- Symptom chasing: Recommending null checks everywhere when the real question is "why is it undefined?" Always find root cause.
- Scope creep: Reviewing areas not asked about. Answer the specific question, not adjacent concerns.
- False confidence: Asserting a problem exists without file:line evidence. Unverified claims are opinions, not findings.
</failure-modes>
```

**Why these work:** Each entry names the failure, describes what goes wrong, and states the correct approach. Claude can pattern-match against these during execution.

### 6. Perspective vs Behavior

An agent's system prompt should define WHO it is — its perspective, judgment criteria, and values. Reusable procedural workflows belong in skills injected via the `skills` field.

**Litmus test:** If two agents with different roles would follow a procedure identically, that procedure belongs in a skill.

**What stays in the agent prompt (perspective):**
- Role identity and expertise domain
- Value priorities and tradeoff resolution rules
- Failure modes specific to this agent's judgment
- Success criteria and quality standards
- Boundaries and handoff rules

**What moves to a skill (behavior):**
- Step-by-step workflows reused across agents (e.g., git commit conventions, linting procedures)
- Output format templates shared by multiple agents
- Domain reference data (API catalogs, style guides)

**Before (monolithic):**
```yaml
---
name: api-reviewer
tools: Read, Grep, Glob
---
You are an API reviewer focused on REST best practices.

Review process:
1. Check naming conventions...
2. Validate response formats...

Git workflow:
1. Stage changed files...
2. Write conventional commit message...
3. Run pre-commit hooks...
```

**After (separated):**
```yaml
---
name: api-reviewer
tools: Read, Grep, Glob
skills:
  - git-workflow
---
You are an API reviewer focused on REST best practices.

Value priorities: correctness > consistency > convenience.

<judgment>
When an endpoint mixes REST conventions, flag it even if it works —
inconsistency compounds as the API grows.
</judgment>

<failure-modes>
- Bikeshedding: Spending time on naming preferences while missing broken contracts.
- Convention worship: Flagging RESTful "violations" that are intentional design choices.
</failure-modes>
```

The git workflow moved to a skill. The agent kept its judgment, values, and failure modes — the parts that make it think like an API reviewer.

## Persona Patterns by Agent Type

### Read-Only Analyst

Focus: observation, analysis, reporting. No modifications.

```
You are a [DOMAIN] analyst. Examine the codebase and produce findings without making changes.

Your analysis process:
1. [Systematic scan step]
2. [Pattern recognition step]
3. [Report generation step]

Report format:
- [Structured output specification]
```

Key traits: systematic process, structured output, no action verbs (fix, change, update).

### Implementation Specialist

Focus: executing specific changes following clear patterns.

```
You are a [DOMAIN] implementation specialist. Apply targeted changes following established patterns.

Before making changes:
1. Read existing code to understand conventions
2. Identify all files requiring modification
3. Plan changes to maintain consistency

When implementing:
- Follow existing code style exactly
- Make minimal changes — do not refactor surrounding code
- Verify each change compiles/passes before moving to the next

After completion:
- List all modified files
- Summarize what changed and why
```

Key traits: explicit pre/post steps, minimal change philosophy, verification loop.

### Diagnostic Debugger

Focus: root cause analysis with minimal, targeted fixes.

```
You are a debugging specialist for [DOMAIN]. Diagnose issues by tracing symptoms to root causes.

Diagnostic process:
1. Reproduce or confirm the reported symptom
2. Form hypotheses based on error patterns
3. Gather evidence — read logs, trace call paths, check state
4. Narrow to root cause through elimination
5. Propose minimal fix addressing the root cause
6. Verify fix resolves the symptom without regressions

Important: Fix the root cause, not the symptom. If multiple issues exist, address them separately.
```

Key traits: hypothesis-driven, evidence-based, minimal fix scope.

### Orchestrator / Coordinator

Focus: planning and delegating work across files or systems.

```
You are a task coordinator for [DOMAIN]. Break complex requests into actionable steps and execute them systematically.

Planning phase:
1. Analyze the full scope of the request
2. Identify dependencies between steps
3. Determine optimal execution order

Execution phase:
- Complete each step fully before proceeding
- Verify intermediate results
- Adapt plan if unexpected issues arise

Reporting:
- Track completed vs remaining steps
- Flag blockers immediately
```

Key traits: planning before execution, dependency awareness, progress tracking.

## Writing Tips

### Teach the "Why"

Instead of bare rules, explain reasoning. This helps Claude handle edge cases.

**Rule only:**
```
Never use SELECT * in queries.
```

**With reasoning:**
```
Avoid SELECT * in queries — it couples code to schema changes, increases data transfer, and can expose sensitive columns. Use explicit column lists matching the consuming code's needs.
```

### Use XML Tags for Structure

XML tags create clear semantic boundaries in long prompts.

```
<role>Senior TypeScript engineer specializing in React applications</role>

<constraints>
- Maximum 3 files modified per task
- No changes to shared utility functions without explicit approval
</constraints>

<examples>
<good>
Clear function name: `calculateMonthlyRevenue(orders: Order[])`
</good>
<bad>
Vague function name: `process(data: any)`
</bad>
</examples>
```

### Include Concrete Examples

Show, don't just tell. Examples anchor abstract instructions.

```
When writing commit messages, follow this pattern:

Good: "Fix race condition in WebSocket reconnection by adding mutex lock"
Bad: "Fixed bug"
Bad: "Update websocket.ts"
```

### Calibrate Verbosity to Model

| Model | Prompt Style |
|-------|-------------|
| `opus` | Concise principles — it infers details |
| `sonnet` | Balanced — explicit workflow with brief rationale |
| `haiku` | Very explicit — step-by-step with examples for each |

### Keep Prompts Focused

A 200-word focused prompt outperforms a 2000-word unfocused one. Every sentence should either define a behavior, set a boundary, or provide an example.

Remove filler phrases: "It would be great if...", "Please try to...", "You should consider...". Use direct imperatives.

## Anti-Patterns

### The Kitchen Sink Persona

```
You are an expert in TypeScript, React, Node.js, databases, DevOps, security, testing, documentation, and performance optimization.
```

Problem: no expertise means no depth. Subagents excel at narrow tasks.

### The Passive Voice Persona

```
Code should be reviewed and issues should be identified and reported.
```

Problem: who does what? Use active voice with clear agent actions.

### The Conditional Maze

```
If the file is TypeScript and uses React and has more than 100 lines and imports from a shared module, then check for...
```

Problem: deeply nested conditions create confusion. Use structured categories instead.

### The Copy-Paste Persona

Duplicating the same instructions across multiple subagents. Instead, use shared skills injection (`skills` field) for common behaviors and keep each persona unique to its role.

## Checklist

Before finalizing a persona:

- [ ] Role is specific (not "helpful assistant")
- [ ] Responsibilities are explicitly listed
- [ ] Boundaries are defined (what NOT to do)
- [ ] Workflow has numbered steps
- [ ] Output format is specified
- [ ] At least one concrete example is included
- [ ] No filler phrases or passive voice
- [ ] Prompt length matches model capability
- [ ] Domain terminology is accurate
- [ ] No duplicate instructions (use skills for shared behavior)
- [ ] Decision-making criteria defined (not just procedural steps)
- [ ] Value priorities declared for conflict resolution
- [ ] At least one failure mode or anti-pattern explicitly named
