---
name: trace-change
user-invocable: true
disable-model-invocation: true
description: '[seiri:trace-change] Produce a layered explanation of a code change — diff, branch, or PR — for a reader whose knowledge you do not assume: two-layer background, the essence on one concrete example, a walkthrough regrouped for understanding, and a comprehension check. Trigger: "explain this change", "변경사항 설명해줘"'
argument-hint: '<diff | branch | PR | staged> [who will read it]'
version: '0.1.0'
complexity: moderate
plugin: seiri
---

# trace-change — teach the change, don't tour it

You were invoked by the user. A diff is ordered for the machine that applies it, not for the person who must understand it; this skill reorders it for the reader. Ask now, in one round, for whatever is missing: which changeset exactly, and who will read the explanation. Step 2 enters work that does not stop to ask.

## Workflow

**1. Fix the change and the reader.** Resolve the exact changeset before writing anything — a diff range, a branch against its base, a PR, or staged changes. Name what the reader is assumed to know; when unknown, assume less and let the skippable layer carry the difference.

**2. Explore around the change, not the change.** The change means nothing outside the system it lands in. Collect background in two layers: **deep** — the standing system a stranger would need, marked skippable for the familiar; **narrow** — only what this change touches, never skippable. A statement about code carries `file:line`; one you did not read is marked as inference.

**3. Isolate the essence on one concrete example.** The core idea in one piece — what this change makes true that was not true before. No enumeration of edits. Pick one small input and walk it through the system before and after the change; reuse that same example everywhere it can serve.

**4. Walk the details, regrouped.** Ignore file order. Group edits by concept, order groups so each rests only on earlier ones, and give each group: what changed, why, and an evidence excerpt. Where the diff contradicts its stated intent — commit message, PR body, comments — report the mismatch as a finding; never smooth it over.

**5. Check comprehension.** Three to five medium questions answerable only from the substance — no gotchas — with answers at the end. If you cannot derive an answer from your own sections, the explanation is incomplete: return to step 2.

## Rules

- Read-only toward the repository. The deliverable is a markdown document, in conversation; write a file only on explicit request. When a rendered page would serve the reader better, offer one — in whatever form the environment provides.
- Section order, per-section contracts, example-data and quiz calibration live in `references/structure.md`.
- The explanation states what IS in the change; it does not review it. Defects you notice are findings for the reader, and a doubt about behaviour too deep for prose deserves a model built to be attacked — suggest `/seiri:mental-model` to the user.
