# Shaping a Change

## Decompose scope first

Before refining any detail, check whether this is one change or several. If the request names parts that could each succeed or fail on their own — separate subsystems, independent surfaces — say so before going deeper. Refining the details of something that should be split first wastes the questions. Each part then gets its own shape.

## Search before you shape

The best shape for this repository often already exists in it. Look for a utility that does part of this, the closest proven pattern, an installed library. "Nothing exists" is a claim that needs a search behind it — report the near-misses you found so the user can correct you.

## Offer distinct shapes, not variants

Put forward two or three shapes that differ in what they TRADE AWAY, not in surface detail. For each, state the cost. If the constraints already point at one, say which and why — a recommendation is not a hedge.

- A shape is distinct when choosing it forecloses something another kept.
- Two options that differ only in naming or ordering are one option wearing two hats. Collapse them and find a real alternative.

## Design for isolation

Shape the change into units each graspable on their own. For each unit you should be able to answer: what it does, how you use it, what it depends on.

- Can someone tell what a unit does without reading its internals? Can the internals change without breaking callers? If not, the boundary is drawn wrong — that is a design finding, surface it now.
- A unit you can hold in view at once is one you reason about more reliably. When one piece keeps demanding that you also hold three others open, that is a boundary smell, not a memory problem — split it, or localise what it needs.

## Make it checkable

Turn the chosen shape into something that could fail: "these inputs are rejected, shown by a check that fails first and passes after" beats "add validation". If you cannot say how it would be verified, the shape is not finished — that gap is itself the next question.
