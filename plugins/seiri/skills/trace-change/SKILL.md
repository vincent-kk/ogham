---
name: trace-change
user-invocable: true
description: 'Explain a diff, branch, PR, or staged change as a self-contained visual HTML page with system context, concrete before/after behavior, code evidence, and a comprehension check. Use for understanding or onboarding, not correctness review.'
argument-hint: '<diff | branch | PR | staged> [who will read it]'
version: '0.4.0'
complexity: moderate
plugin: seiri
---

# trace-change — teach the change

A diff is ordered for application, not understanding. Build the smallest working model that lets the reader predict the changed behavior, then teach it as a rich visual page. Ask only when plausible scopes differ materially; otherwise assume a smart newcomer and state that assumption.

## Build the explanation

1. **Resolve the comparison.** Establish the exact base and head, intended scope, and reader. Exclude generated noise and unrelated working-tree edits.
2. **Explore the background.** Read the diff and tests, then follow enough entry points, callers, data, and contracts to explain where the change sits and why the old path made sense. Make deep beginner context skippable.
3. **Teach the essence.** Carry a small concrete input through before and after. Explain the pressure, intervention, observable effect, and the boundaries that stay unchanged. Give independent themes their own examples.
4. **Walk the code.** Regroup changes by responsibility and causal order, not file or diff order. Show only the excerpts that make the worked example true.
5. **Check the model.** End with a few medium-difficulty multiple-choice questions about what the page taught. Each choice gives immediate explanatory feedback; no gotchas.

## Make the page

- Produce one dated, self-contained HTML file outside the repository, with CSS and JavaScript inline and no external dependency. Use one long reading path with section headings and linked contents, not top-level tabs.
- Lead with the conclusion and the problem that makes it useful. Use a conclusion-first, problem-led voice: conversational but exact, short paragraphs, reader-question transitions, jargon defined at first use, and candid limits and tradeoffs. Let the material choose its headings and rhythm.
- Choose a coherent editorial direction with readable hierarchy, contrast, spacing, and code. Use quiet neutrals for page and text, one primary accent for identity, and secondary accents only for meaningful comparison or status. Keep typography, diagrams, code, and controls in one family. Let content choose hues and typefaces; fix no tokens or template. Use cards only when a boundary or comparison benefits from one.
- Use a small, consistent family of diagrams. Put the example's real values in the visual, show the changed path or same-input delta, and remove any visual that adds no information. Use semantic HTML/CSS or accessible inline SVG, never ASCII.
- Preserve code whitespace with `<pre><code>` or an equivalent `white-space` rule. Give figures captions, make controls keyboard-usable, and never rely on color alone for meaning.
- Check one desktop and one phone viewport for layout, contrast, overflow, and each interaction type once. Fix display defects, then recheck only affected views; avoid exhaustive browser coverage or subject correctness testing.

## Evidence and hand-off

- Cite consequential code claims with `path:line`. Attribute supplied rationale; label a plausible but unproven bridge **Inference**, and a mismatch noticed while explaining **Finding**.
- Escape repository text before inserting it into HTML. Stay read-only toward the repository being explained; write only the artifact outside it.
- Return the comparison, assumed reader, and artifact path in a few lines. Do not duplicate the long explanation in chat.
- As the final step, open the completed HTML file in the system default browser.
