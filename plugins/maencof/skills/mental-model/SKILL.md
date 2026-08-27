---
name: mental-model
user-invocable: true
description: 'Infer and attack the predictive core principle behind a person, organization, system, plan, or codebase, then teach concrete deductions in a self-contained visual HTML article. Use to explain how a subject works or responds; not for retrieval, diff review, or observed-failure diagnosis.'
argument-hint: '<question about a subject> [reader]'
version: '2.0.0'
complexity: medium
context_layers: []
orchestrator: mental-model skill
plugin: maencof
---

# mental-model — teach any subject from one principle

A mental model lets a reader predict unseen behavior. Its subject and evidence may live anywhere; the maencof vault is optional, not its boundary. Ask only when scope, audience, or user-only evidence would change the model; otherwise assume a smart newcomer.

## Build the model

1. **Frame the question.** State what the reader must decide or predict. Route evidence from the question and subject, then trace only what the answer needs.
2. **Propose the predictive core principle.** Explain several facts and predict one uninspected case; reject generic praise. Carry one concrete scenario with real names and values through its actual sequence.
3. **Deduce the subject.** Derive features as **premise → consequence → mechanism → observable behavior**. Keep only children made necessary by their parent; explain interactions.
4. **Attack the model.** Attack each claim in one dimension—structure, behavior, or purpose. Predict a counterexample and inspect independent evidence not used to build it. A claim survives only after this attack; otherwise it stays pending and cannot support the core or answer. Simulate the scenario end to end; show the attack, limit, and refutation. If the core principle changes, discard dependents and repeat steps 2–4 to rederive and reattack them. After two failed core proposals, stop without a model or HTML: no single principle survived.
5. **Close with transfer.** Ask the reader to predict one unseen case, then reveal why. If survivors cannot answer it and the original question, gather more evidence.

## Choose evidence for the subject

- Prefer behavior, events, runtime traces, and outcomes for claims about what happens. Statements, plans, comments, and docs show declared intent until behavior confirms them; a mismatch is a finding.
- For code and technical systems, inspect only the needed entry points, callers, state, tests, contracts, and traces; cite code at `path:line`.
- For people, organizations, and plans, use dated actions, decisions, outcomes, statements, and independent accounts. Retellings of one account are one source.
- The maencof vault is optional and usable only when available and relevant. Use `kg_search`, `kg_navigate`, and `read` for records. If a vault call fails, mark it unavailable—not negative evidence—and continue with non-vault sources. Use `kg_status` only for an explicit index diagnostic.
- Use conversation, supplied files, repositories, or authoritative external sources. If only the user can fill a gap, ask once for that evidence; if it stays insufficient, stop without a model or HTML.

Mark each claim `traced` (direct evidence with a stable locator: `path:line`, section, URL, dated event, or quotation with speaker, date/turn, and source locator), `inferred` (from traced evidence), or `assumed` (ungrounded). The mark describes the claim, not the reading act.

## Teach it as a visual article

Lead with the conclusion and useful problem. Be conversational but exact: short paragraphs, reader-question transitions, jargon defined once, and candid limits and tradeoffs. Let the material choose headings.

Use visuals as evidence when relationships, structure, sequence, state, or comparison are faster to see than read. Show actual names and values; reuse a small visual language and let prose interpret. Give diagrams text equivalents and controls accessible labels. No decoration.

Choose readable hierarchy, contrast, spacing, and code. Use quiet neutrals, one primary accent, and secondary accents only for meaningful comparison or status. Let content choose hues, typefaces, layout, and diagrams; fix no tokens or template.

## Evidence and artifact

- Write one single self-contained HTML file with inline CSS and JavaScript to a writable filesystem location selected by the current environment for temporary or scratch files; let the environment choose the concrete path and filename.
- Escape source text inserted into HTML. Put code in `<pre>` with `white-space: pre` or `pre-wrap`.
- Inspect desktop and mobile rendering for flow, contrast, overflow, code wrapping, and interactions. If no browser or renderer is available, mark rendering unverified in the artifact and handoff; never claim inspection.
- Keep all evidence sources read-only; write only the external HTML unless the user explicitly requests another destination or persistence workflow.
- In chat, return one sentence about the model and a link. Do not duplicate the article in Markdown.
- As the final step, open the completed HTML file in the system default browser.
