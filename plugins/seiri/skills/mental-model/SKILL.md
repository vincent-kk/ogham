---
name: mental-model
user-invocable: true
description: 'Infer and attack the predictive core principle behind a codebase, then teach its concrete deductions in a self-contained visual HTML article. Use to explain how a system works; not for diff review or diagnosis of an observed failure.'
argument-hint: '<question about how the code behaves> [reader]'
version: '0.4.0'
complexity: moderate
plugin: seiri
---

# mental-model — teach the system from one principle

A mental model is useful when a reader can predict unseen behavior. Find one principle that explains the code, attack it, then teach what survives. Ask only when scope or audience changes the model; otherwise assume a smart newcomer and say so.

## Build the model

1. **Frame the question.** State what the reader must decide or predict. Load `/seiri:trace-structure`; trace only the entry points, callers, state, tests, and contracts needed. Comments and docs evidence intent, not runtime behavior.
2. **Propose the predictive core principle.** It must explain several facts and predict one uninspected case. Reject generic praise such as “separation of concerns.” Carry one concrete input with real values through the real end-to-end path; anchor every abstraction to an observable step.
3. **Deduce the system.** Derive each feature as **premise → consequence → mechanism → observable behavior**. A child belongs only when its parent makes it necessary. Explain why the parts exist and cooperate.
4. **Attack the model.** Keep each child claim to one falsification dimension—structure, behavior, or domain. Predict a counterexample, then inspect another caller, branch, error path, registration, test, or trace. Simulate the example hop by hop. In the article, show each attack and its remaining limit; keep a refuted claim beside the counterexample that killed it, and rewrite its parent principle.
5. **Close with transfer.** Ask the reader to predict one unseen case, then reveal the reasoning. If surviving claims cannot answer it and the original question, return to tracing.

## Teach it as a visual article

Lead with the conclusion and the problem that makes it useful. Use a conclusion-first, problem-led voice: conversational but exact, short paragraphs, reader-question transitions, jargon defined at first use, and candid limits and tradeoffs. Let the material choose its headings and rhythm.

Use visuals as evidence when relationships, structure, sequence, state, or comparison are faster to see than read. Show actual names and values; reuse a small visual language. Prose interprets rather than repeats. A deduction map may help, but let content choose the diagrams. No ASCII or decoration.

Choose a coherent editorial direction with readable hierarchy, contrast, spacing, and code. Use quiet neutrals for page and text, one primary accent for identity, and secondary accents only for meaningful comparison or status. Keep typography, diagrams, code, and controls in one family. Let content choose hues and typefaces; fix no tokens or template.

## Evidence and artifact

- Mark claims `traced` (code evidence at `path:line`), `inferred` (from traced facts), or `assumed` (ungrounded). A mark describes the claim, not a document about it.
- Write a self-contained HTML with inline CSS and JavaScript to environment-chosen temporary storage or a scratchpad outside the repository. Name it `YYYY-MM-DD-mental-model-<slug>.html`; return its path.
- Escape repository text inserted into HTML. Put code in `<pre>` with `white-space: pre` or `pre-wrap`; give diagrams text equivalents and controls accessible labels.
- Inspect desktop and mobile rendering for flow, contrast, overflow, code wrapping, and interactions. Keep the analyzed repository read-only; write only the external HTML.
- In chat, return one sentence about the model and a link. Do not duplicate the article in Markdown.

Route defects to `/seiri:trace-cause`, future design to `/seiri:brainstorm`, and diffs to `/seiri:trace-change`.

- As the final step, open the completed HTML file in the system default browser.
