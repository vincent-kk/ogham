---
name: clarify-request
user-invocable: true
description: 'Clarify an ambiguous development request into an actionable, testable scope. Use when missing intent or constraints could materially change implementation; skip when the request is already actionable.'
argument-hint: '<request to clarify>'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# clarify-request — make ambiguous work actionable

Clarify only enough to proceed without consequential guessing.

- Inspect the repository before asking about facts it can answer.
- Ask only questions whose answers could materially change the implementation. Group or sequence them as useful, and stop when the request is actionable.
- Make and disclose low-risk assumptions when they preserve momentum. Never invent a decision that would materially change scope, behavior, or constraints; leave it open instead.
- Record the outcome in the lightest useful form. Include intent, observable success, boundaries, and open decisions only when they add information.

If the result is ready for implementation, hand it to `/seiri:write-plan` for multi-step work or `/seiri:implement` for a surgical change.
