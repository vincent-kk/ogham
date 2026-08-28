---
name: brainstorm
user-invocable: true
description: 'Explore and choose a repository-grounded design before implementation. Use when a change has meaningful design alternatives; skip when the path is already clear.'
argument-hint: '<change to shape>'
version: '0.4.0'
complexity: simple
plugin: seiri
---

# brainstorm — choose a shape worth implementing

Use the lightest process that exposes the real design decision.

- Inspect existing patterns, constraints, and reusable code before proposing a shape. Distinguish repository evidence from preference.
- Compare only alternatives with consequential tradeoffs. If one shape clearly fits, recommend it directly instead of manufacturing options.
- Explain the decisive evidence and tradeoffs, affected boundaries, and how success can be observed. Ask only when an unresolved choice would materially change the design; otherwise disclose a reasonable assumption.
- When feasibility is uncertain, gather the smallest safe evidence that would settle it.
- Leave a compact decision record in the form best suited to the task, preserving only material risks or open decisions.
- Documents follow the session's response language; machine-read tokens, identifiers, paths, code, and commands stay verbatim.

Hand an approved shape to `/seiri:write-plan` for multi-step work or `/seiri:implement` for a surgical change.
