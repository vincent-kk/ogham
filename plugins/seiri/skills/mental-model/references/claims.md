# Claims

## A claim predicts; a summary describes

A claim states what must hold, and names what breaks when it does not. If nothing in the codebase could contradict a sentence, it is summary — it may well be true, but it cannot be checked, and it does not belong in the model.

- Summary: "This module handles authentication."
- Claim: "Every path that reaches `refresh()` has already checked expiry — an unchecked path would rotate a live token out from under its caller."

The second half is what makes it attackable. A claim with no "or else" gives you nothing to go looking for.

## Three layers, one per claim

**Structure** — what reaches what. Which entry points exist, which call paths are live, what is registered where. Refuted by an edge that exists and should not, or one the claim requires and cannot be found.

**Behaviour** — what must hold while running. Ordering, invariants, which states are legal at a point, what a failure leaves behind. Refuted by a branch, an error path, or a second caller under which it stops holding.

**Domain** — what the code is for, in the vocabulary of the problem rather than of the program. Refuted by code that serves a different purpose than its name and shape advertise.

Layers fail differently, which is why one claim may not span two: a counterexample against half of it leaves the other half standing, and the claim survives without having been tested. Split it instead.

## Marks

- `traced` — you read it; the claim cites `file:line`.
- `inferred` — it follows from traced facts, but you did not read the thing itself.
- `assumed` — neither. Legitimate, and written down precisely so a later reader can attack it.

An unmarked claim reads as `traced` to whoever comes next. That is the failure this vocabulary exists to prevent — not to grade your confidence, but to keep an assumption from being inherited as a fact.
