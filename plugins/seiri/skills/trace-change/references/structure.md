# Explanation Structure

The document a trace-change run produces, in order. Every section opens with the one sentence it owes the reader; a section that cannot pay opens with what is missing instead.

## Sections

**Background — deep.** The standing system, for a reader who has never seen it: the components the change touches, what they were for, how they connected. Marked skippable ("familiar with X? skip to the narrow background"). Everything here was true before the change.

**Background — narrow.** Only what this change touches, never skippable: the specific behaviour, contract, or path about to move, and why it mattered as it was.

**Essence.** The change's core idea in one piece: what is true after that was not before, and the shape of how. One concrete example with toy data, walked before and after. No file names required here; the reader should finish this section able to guess the diff.

**Walkthrough.** The edits, grouped by concept and ordered so each group rests only on earlier ones. Per group: what changed, why, one excerpt as evidence (`file:line`). The example from Essence reappears wherever it can carry a step. A mismatch between the diff and its stated intent, or a defect noticed, stands inside its group as a **Finding:** line — set apart, never smoothed into the narrative.

**Check.** Three to five questions, answers at the end; multiple-choice where wrong-but-plausible options exist, open otherwise.

## Example data

Small enough to hold in the head — two users, one item, a three-line config. Concrete values, not placeholders (`alice`, `42`, never `<user>`, `<n>`). One example reused across sections beats three examples introduced once.

## Quiz calibration

Medium difficulty: answerable from the substance of the explanation, not from its headings — and not from trivia the explanation never showed. A question whose answer quotes a heading is too easy; one that needs an unshown line number is a gotcha. Good forms: "what happens to X after this change when Y", "why could the old code not simply Z", "which group breaks if W is reordered". In multiple-choice questions, wrong-but-plausible options come from the old behaviour and from the misreading the explanation worked hardest to prevent.
