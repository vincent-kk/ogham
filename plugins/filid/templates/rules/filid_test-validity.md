# Test Validity Rules

A passing test is evidence only if it could have failed. These rules define
when a test counts as verification. Distilled from merge-blocking review
contracts in large agent-operated repositories and from execution-based
benchmark methodology (fail-to-pass / pass-to-pass task construction).

**Tradeoff:** These rules add one verification step per test. For throwaway
spikes, use judgment — but a test you never saw fail proves nothing either way.

## 1. Fail First, Then Fix

**A fix's test is valid only if it fails without the fix.**

- Before finishing a bug fix, run its test against the pre-fix code (stash
  the fix, or revert the change locally) and confirm it fails.
- A test that passes both with and without the change verifies nothing.
  It is worse than no test: it certifies the bug as handled.
- The failure must be for the right reason — the bug's symptom, not a
  missing import, a wrong path, or a setup error.
- Refactors invert the contract: the suite MUST pass unchanged before and
  after. Pin current behavior with characterization tests BEFORE moving code.

Ask yourself: "Have I watched this test fail for the reason the bug exists?"

## 2. Test the Artifact You Changed

**Verification against the wrong build always passes.**

- Confirm the harness exercises your modified code — not a system-installed
  binary, a stale build output, or a cached dependency.
- Use the repository's canonical wrapper commands (package scripts, `just`,
  `make`). If a wrapper exists, invoking the underlying tool directly is a
  violation: wrappers exist because the raw tool tests the wrong thing.
- If unsure, break your change deliberately once — the suite must go red.
  If it stays green, you are not testing what you changed.

Ask yourself: "If my change were deleted, would this command notice?"

## 3. Snapshots Are Claims, Not Truth

**A snapshot captured from buggy code certifies the bug.**

- Read snapshot contents before committing them. A regenerated snapshot is
  an assertion you are making, not output you are recording.
- Never regenerate snapshots to turn a suite green without stating, in the
  diff or commit message, why the new output is the correct output.

Ask yourself: "Can I defend every changed line of this snapshot?"

## 4. Skips Must Be Loud

**A silent skip reports PASSED.**

- Use the harness's skip mechanism with a reason string. A bare early
  `return` or a commented-out assertion turns a missing test into a green one.
- A test that cannot run in the current environment is a skip with a
  reason, never a pass.

Ask yourself: "If this test silently stopped testing, would anyone know?"

## 5. Fixes Must Be Load-Bearing

**Every clause of the fix should be required by some test.**

- Delete each load-bearing clause of your fix (mentally, or actually): at
  least one test must break for each. A clause no test requires is either
  untested or unnecessary.
- Apply the same check to defensive code you add: a guard no input can
  reach is scope creep wearing a safety vest.

Ask yourself: "Which test breaks if I remove this line?"

---

**These rules are working if:** your tests fail before your fixes and pass
after, snapshot diffs are explained, skipped tests say why, and deleting
any part of a fix turns something red.
