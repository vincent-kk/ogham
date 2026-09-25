---
name: write-plan
user-invocable: true
description: 'Plan substantial changes that need a durable implementation path. Follow the selected planning method; skip short investigations, explanations, and routine edits.'
argument-hint: '[the spec or goal to plan]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# write-plan — choose the method; keep the plan session-independent

Plan substantial changes; choose reversible details autonomously. Ask only about consequential unresolved choices. Explanations and short investigations need no plan. Use [workflow lifecycle](../execute/references/workflow-lifecycle.md) only for useful sustained change assistance.

## Choose the planning method

Use the first applicable source, in order:

1. A planning method explicitly named by the user.
2. Repository planning instructions or templates.
3. Another planning skill selected under the host's skill-selection rules.
4. The default method below.

Higher-precedence instructions bind. A skill is not selected merely because it is installed. Name the method and source in native metadata or `Planning method: <source>`. Follow the selected method's native structure; do not merge it with the default method.

## Invariants

Regardless of method:

- Write enough that a capable implementer can proceed without this conversation.
- Ground claims about the current repository with tools and retain compact evidence a later reviewer can reproduce.
- Connect every requirement to implementation work and observable verification; do not add work with no requirement.
- Resolve the implementation direction needed for an executable plan within planning.
- Leave no unresolved placeholder disguised as a step. A real unresolved decision names its owner and stops the affected work.
- When durable verification tracking is useful, write `.seiri/tasks/<name>/gates.md` per `skills/execute/references/gates-format.md`. Execution does not require a ledger. Design each CHECK/EXPECT pair together: CHECK tests the actual result condition and emits a fixed literal EXPECT marker only on success. Every CHECK and EXPECT value stays in a Markdown code span. Keep the ledger's fixed machine format separate from the plan's chosen human format.
- A structural decision chooses module boundaries, dependency direction, public ownership or contracts, or durable code placement. When one occurs while planning, write `adr.md` beside the plan. Otherwise do not create it.
- Make the ADR readable without the plan: state the context, decision, reasons, rejected alternatives, and consequences. Keep implementation steps in the plan.

## Default method

Use this only when no other planning method applies:

1. Ground the outcome, constraints, current behavior, and observable success.
2. Map the change surface with exact confirmed paths; make uncertain locations bounded discovery steps.
3. Cut independently reviewable outcomes that leave the repository verifiable.
4. State ordering, dependencies, and consumed interfaces, including contract names, signatures, and types.
5. Give each outcome executable steps, commands, and expected results. Reject vague placeholders; include code only when it is the contract.
6. Self-review once for requirement coverage, evidence, boundary names, and placeholders; fix findings inline.

## Rules

- Let the selected method or repository choose the plan location. When neither does, name the task in kebab-case (`^[a-z0-9]+(?:-[a-z0-9]+)*$`) and save the default plan to `.seiri/tasks/<name>/plan.md`; the ledger's `Plan:` line points to the actual plan.
- Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.
- Review before execution when unresolved risk warrants it. Reuse a valid review of the same plan; changed claims need only a scoped recheck. A single surgical change does not need a plan.
