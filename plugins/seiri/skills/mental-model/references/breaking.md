# Breaking a Claim

Attacking a claim means going looking for the code that makes it false — not re-reading the code that suggested it. Confirmation is cheap and proves nothing: the code you already read is the code that produced the claim.

The strongest attack is a prediction: if the claim holds, some file you have not opened must look a certain way — a caller, a config, a test — name it, then open it. And count your angles: a claim read off the implementation alone rests on one projection, and one projection fits many models; a caller, a test, or a runtime trace is a second angle at almost no cost.

## Where the counterexample hides

**Structure claims** — dynamic dispatch that resolves somewhere you did not look; registration by string, filename, or convention; a second implementation of the same interface; a consumer reaching an internal directly rather than through the entry point; generated or vendored code carrying its own copy.

**Behaviour claims** — the early return; the error and cleanup path; the second caller that skips the guard the first one honours; initialization and shutdown order; retries and reentrancy; and whatever the test suite mocks — a mock encodes an assumption, and an assumption is an unattacked claim.

**Domain claims** — the name that means something else in this codebase; the field kept alive for exactly one caller; the special case that turns out to carry the main traffic.

## When the attack fails

Say which attack you ran, and downgrade nothing to certainty. "I looked for callers that skip the check and found none across the 7 call sites" is a result. "The invariant holds" is a different sentence, and you did not earn it.

## When the attack succeeds

The refuted claim stays in the report with its counterexample beside it. A claim someone already killed is more useful than its silent absence, which reads as never-considered.

Then fix the model, not the wording. A claim narrowed until nothing can contradict it has been retired, not repaired — say that it was retired.
