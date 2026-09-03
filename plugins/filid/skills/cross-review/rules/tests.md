# Test Review Rules

Apply these rules to changed verification files and to changed behavior whose verification should be visible in the diff. Every finding uses category `test`.

## Behavioral Evidence

- **TST-1 — Changed behavior**: Does each changed behavior or defect clause have a test that would fail when that behavior is absent or wrong?
- **TST-2 — Non-tautological assertion**: Can each changed assertion fail independently of the implementation value it claims to check?
- **TST-3 — Contract focus**: Would the changed test keep passing after a behavior-preserving refactor instead of failing only because an internal call, order, or representation changed?

## Execution Integrity

- **TST-4 — Skip and focus markers**: Does the change leave a skip, todo, focus, or only marker that prevents required coverage from running normally?
- **TST-5 — Determinism**: Can the changed test vary with wall-clock time, random state, concurrency order, locale, environment, network, or shared mutable state without explicit control?

## Fixture Independence

- **TST-6 — Production logic duplication**: Does a changed fixture or expected-value helper reproduce the production algorithm closely enough that the same defect can make both sides agree?

