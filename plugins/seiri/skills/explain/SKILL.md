---
name: explain
user-invocable: true
description: 'Explain how a system works in a self-contained visual HTML article: trace connected code until understanding is grounded, then teach the key concepts and their relationships in a problem-first narrative. Use to explain how a system works; not for diff review or diagnosis of an observed failure.'
argument-hint: '<question about how the code behaves> [reader]'
version: '0.5.0'
complexity: moderate
plugin: seiri
---

# explain — teach concepts and their relationships

An explanation succeeds when the reader holds the needed concepts, sees how they relate, and can follow real behavior through them. Understand accurately first; teach one concept at a time. Ask only when scope or audience changes the article; otherwise assume a smart newcomer.

## Understand before writing

1. **Frame the question.** State what the reader must come to understand. Load `/seiri:trace-structure` and trace the needed entry points, callers, state, tests, and contracts.
2. **Follow the connections.** Never explain from the pointed-at material alone: follow what it links to — callers and callees, configs, tests, docs, conventions — until behavior is understood rather than guessed. Comments and docs show intent, not runtime behavior.
3. **Map the concepts.** List the terms the reader must hold, give each a concrete one-sentence definition, and name its relationships to the others — calls, owns, precedes, constrains. This map is the article's backbone; a concept unrelated to the question is cut.
4. **Stay concrete.** Carry one real input with actual values through the real end-to-end path; anchor every abstraction to an observable step. A sentence that can name no file, value, or behavior is not ready to be written.

## Teach it as a visual article

Write in the editorial style of [reference.md](reference.md): open with the problem the reader feels, introduce each concept only when the narrative needs it, define terms at first use, make relationships explicit in prose and visible in diagrams, sandwich code with purpose and payoff, and close on honest limits. Let the material choose its headings and rhythm.

Use visuals as evidence when relationships, structure, sequence, state, or comparison are faster to see than read. Show actual names and values; reuse a small visual language. Prose interprets rather than repeats. No ASCII or decoration.

Choose a coherent editorial direction with readable hierarchy, contrast, spacing, and code. Use quiet neutrals for page and text, one primary accent for identity, and secondary accents only for meaningful comparison or status. Keep typography, diagrams, code, and controls in one family. Let content choose hues and typefaces; fix no tokens or template.

## Evidence and artifact

- Mark claims `traced` (code evidence at `path:line`), `inferred` (from traced facts), or `assumed` (ungrounded). A mark describes the claim, not a document about it.
- Write a self-contained HTML with inline CSS and JavaScript to environment-chosen temporary storage or a scratchpad outside the repository. Name it `YYYY-MM-DD-explain-<slug>.html`; return its path.
- Escape repository text inserted into HTML. Put code in `<pre>` with `white-space: pre` or `pre-wrap`; give diagrams text equivalents and controls accessible labels.
- Check one desktop and one phone viewport for layout, contrast, overflow, and each interaction type once. Fix display defects, then recheck only affected views; avoid exhaustive browser coverage or subject correctness testing. Keep the repository read-only; write only the external HTML.
- In chat, return one sentence about the article and a link. Do not duplicate the article in Markdown.

Architecture `/seiri:architect`; plans `/seiri:write-plan`; defects `/seiri:trace-cause`; diffs `/seiri:trace-change`.

- As the final step, open the completed HTML file in the system default browser.
