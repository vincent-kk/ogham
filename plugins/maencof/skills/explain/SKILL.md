---
name: explain
user-invocable: true
description: 'Explain how a person, organization, system, plan, or codebase works in a self-contained visual HTML article: follow connected evidence until understanding is grounded, then teach the key concepts and their relationships in a problem-first narrative. Use to explain how a subject works or responds; not for retrieval, diff review, or observed-failure diagnosis.'
argument-hint: '<question about a subject> [reader]'
version: '2.1.0'
complexity: medium
context_layers: []
orchestrator: explain skill
plugin: maencof
---

# explain — teach concepts and their relationships

An explanation succeeds when the reader holds the needed concepts, sees how they relate, and can follow the subject's real behavior through them. Its subject and evidence may live anywhere; the maencof vault is optional, not its boundary. Ask only when scope, audience, or user-only evidence would change the article; otherwise assume a smart newcomer.

## Understand before writing

1. **Frame the question.** State what the reader must come to understand. Route evidence from the question and subject, then trace only what the answer needs.
2. **Follow the connections.** Never explain from the pointed-at material alone: follow what it links to — callers, configs, and tests for code; dated actions, outcomes, and independent accounts for people, organizations, and plans; linked records in the vault — until behavior is understood rather than guessed.
3. **Map the concepts.** List the terms the reader must hold, give each a concrete one-sentence definition, and name its relationships to the others — calls, owns, precedes, constrains, influences. This map is the article's backbone; a concept unrelated to the question is cut.
4. **Stay concrete.** Carry one real scenario with actual names, values, and dates through its actual sequence; anchor every abstraction to an observable step. A sentence that can name no source, value, or behavior is not ready to be written.

## Choose evidence for the subject

- Prefer behavior, events, runtime traces, and outcomes for claims about what happens. Statements, plans, comments, and docs show declared intent until behavior confirms them; a mismatch is a finding.
- For code and technical systems, inspect only the needed entry points, callers, state, tests, contracts, and traces; cite code at `path:line`.
- For people, organizations, and plans, use dated actions, decisions, outcomes, statements, and independent accounts. Retellings of one account are one source.
- The maencof vault is optional and usable only when available and relevant. Use `kg_search`, `kg_navigate`, and `read` for records. If a vault call fails, mark it unavailable—not negative evidence—and continue with non-vault sources. Use `kg_status` only for an explicit index diagnostic.
- Use conversation, supplied files, repositories, or authoritative external sources. If only the user can fill a gap, ask once for that evidence; if it stays insufficient, stop without an article.

Mark each claim `traced` (direct evidence with a stable locator: `path:line`, section, URL, dated event, or quotation with speaker, date/turn, and source locator), `inferred` (from traced evidence), or `assumed` (ungrounded). The mark describes the claim, not the reading act.

## Teach it as a visual article

Write in the editorial style of [reference.md](reference.md): open with the problem the reader feels, introduce each concept only when the narrative needs it, define terms at first use, make relationships explicit in prose and visible in diagrams, sandwich code with purpose and payoff, and close on honest limits. Let the material choose its headings and rhythm.

Use visuals as evidence when relationships, structure, sequence, state, or comparison are faster to see than read. Show actual names and values; reuse a small visual language and let prose interpret. Give diagrams text equivalents and controls accessible labels. No decoration.

Choose readable hierarchy, contrast, spacing, and code. Use quiet neutrals, one primary accent, and secondary accents only for meaningful comparison or status. Let content choose hues, typefaces, layout, and diagrams; fix no tokens or template.

## Evidence and artifact

- Write one single self-contained HTML file with inline CSS and JavaScript to a writable filesystem location selected by the current environment for temporary or scratch files; let the environment choose the concrete path and filename.
- Escape source text inserted into HTML. Put code in `<pre>` with `white-space: pre` or `pre-wrap`.
- Check one desktop and one phone viewport for layout, contrast, overflow, and each interaction type once. Fix display defects, then recheck only affected views; avoid exhaustive browser coverage or subject correctness testing. If no browser or renderer is available, mark rendering unverified in the artifact and handoff; never claim inspection.
- Keep all evidence sources read-only; write only the external HTML unless the user explicitly requests another destination or persistence workflow.
- In chat, return one sentence about the article and a link. Do not duplicate the article in Markdown.
- As the final step, open the completed HTML file in the system default browser.
