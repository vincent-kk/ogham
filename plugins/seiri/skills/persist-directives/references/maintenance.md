# Directive set maintenance

Read this before a retrospective and before you edit any document of a set. A set decays in two ways: rules pile up beside the rules they replace, and history leaks into documents that should state only what is in force. Everything below exists to prevent those two.

## While working

- Append a line to the notepad the moment something must not be lost: a decision the user made, a mistake and its cause, a fact that took effort to establish, a change of plan. One or two sentences; do not distill yet.
- When the user changes a rule, note it as theirs ("User decided: …"). It outranks older rules at the retrospective.
- Leave the `rewrite` documents alone in the middle of a task, except `dashboard.md` when the state of the work changes.

## The retrospective

Hold one when a unit of work ends, one full round from planning through review, implementation, testing and rework, and before the next unit begins.

1. Read the notepad and every `rewrite` document of the set, whole.
2. Ask what the round taught: what cost time or came back as a finding, its cause in the way of working, and the change that prevents it; and what worked and is to be kept.
3. Place each lesson by the table below.
4. Rewrite the documents by the rules below.
5. Append to the history what is worth being able to look up later: a decision with its reason, an event that changed the plan.
6. Refresh `dashboard.md`.
7. Check the set's status, fix every violation, then empty the notepad by writing it as an empty file.

## Where content goes

| Content                                                          | Document                                 |
| ---------------------------------------------------------------- | ---------------------------------------- |
| A rule to judge by, a prohibition, a decision not to be reopened | `principles.md`                          |
| Its one-line form, when it decides most questions                | `index.md`                               |
| How work is divided, staged or delegated; which model and effort | `orchestration.md`                       |
| What is in progress, next, or blocked                            | `dashboard.md`                           |
| What happened, what was decided and why                          | `history.jsonl`                          |
| A recurring kind of content with no home above                   | an extension document; see the structure |

## Rewriting

- A `rewrite` document is never appended to. Read it whole first.
- Find the sentence that already covers the matter and rewrite that sentence. Add a sentence only when the rule is entirely new, in the section it belongs to, in as few words as carry it.
- A rule that a later one replaces is deleted, not kept beside it. Two rules that contradict each other are a defect in the document, not a record of its history.
- The later user instruction wins. When two user instructions conflict and you cannot tell which is in force, ask the user; do not keep both and do not pick one.
- A `rewrite` document carries no history: no dates, no "previously", no account of how a rule arose. That belongs in the history, or nowhere.
- State each rule as a present fact, one rule per sentence. An item of experience names the failure it prevents or the result that showed it works.
- After rewriting, reread the whole document once: the same term for the same thing, no rule stated twice, each section still saying what its heading promises.

## When a document outgrows its limit

- `index.md`: keep one line per principle and move the detail to `principles.md`.
- `principles.md`: merge sentences that overlap, move procedure to `orchestration.md` or an extension document, promote knowledge that outlives the workflow to the repository's documents, and delete rules about work that is finished.
- `dashboard.md`: drop finished items; the history has them if they were worth keeping.

Never make a document fit by deleting a rule that is still in force.

## When the workflow ends

Propose to the user which knowledge moves to the repository's documents, then propose removing the set. Removal is the user's decision.
