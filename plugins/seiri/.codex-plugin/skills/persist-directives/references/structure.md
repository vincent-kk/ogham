# Directive set structure

Read this when you create a set, restructure one, or add or split a document.

## What belongs in a set

Three layers of record exist, and a set is the middle one.

| Layer                | Lives as long as    | Holds                                                         |
| -------------------- | ------------------- | ------------------------------------------------------------- |
| Repository documents | the repository      | what the whole repository keeps consistent                    |
| Directive set        | one workflow        | what one agent must still know after every context compaction |
| Session context      | the next compaction | the work in progress                                          |

Write into a set only what this workflow needs. Knowledge that must outlive the workflow goes to the repository's documents, and the set is removed when the work lands.

## Documents

| File               | Read                                                          | Write                                            | Limit        |
| ------------------ | ------------------------------------------------------------- | ------------------------------------------------ | ------------ |
| `index.md`         | injected whole after every compaction                         | rewrite                                          | 4,000 bytes  |
| `principles.md`    | after every compaction                                        | rewrite                                          | 10,000 bytes |
| `dashboard.md`     | after every compaction                                        | rewrite                                          | 3,000 bytes  |
| `notepad.jsonl`    | after every compaction while it has lines; at a retrospective | append, then cleared when the retrospective ends | none         |
| `orchestration.md` | before dividing work or starting a stage                      | rewrite                                          | none         |
| `history.jsonl`    | only when a past decision or event is in question             | append                                           | none         |

- **`index.md`** is the entry: the goal, the few principles that decide most questions, the document table, and the maintenance rules. Nothing else. It is the only document guaranteed to be in context after a compaction.
- **`principles.md`** holds what the agent judges by: the principles and prohibitions that did not fit the entry, and decisions that are not to be reopened. Every sentence is a rule in force.
- **`orchestration.md`** holds how the work is divided and run: stages, who does what, which model and effort suit which kind of decision. It has no prescribed format.
- **`dashboard.md`** holds the state of the work: in progress, next, blocked. State only, never rules.
- **`history.jsonl`** is the one place a record of events and decisions is kept, so that history does not spread into the other documents. One JSON object per line.
- **`notepad.jsonl`** takes short notes during the work, before they are distilled, so that a compaction cannot lose them.

A set holds only the documents it uses; `index.md` alone is a complete structured set. A set without `index.md` is valid too: it is unstructured, every file is injected or reread whole, and it suits a handful of short instructions.

`rewrite` means the document is read whole and kept consistent, never appended to. `append` means lines are only ever added, through the runtime's append operation, which stamps the time.

## Extension documents

Add a document when a kind of content has no home in the table above, for example checklists of experience per stage. Name it for what it holds, and add a row to the `Documents` table in `index.md`: the file, when to read it, and whether it is `rewrite` or `append`. A file the entry does not name is reported as a violation, and so is an extension document the entry names that does not exist.

## Limits

Limits are counted in UTF-8 bytes and are the same on every host. Text outside ASCII takes more bytes per character (three for Korean), so less of it fits. Nothing blocks an oversized write: the `status` and `bind` replies list the violation, and an `index.md` over its limit is not injected after compaction; the session is told to read it instead.

## `index.md` template

```markdown
# <set name>

Scope: <what this workflow covers>. Working knowledge for this workflow only; what must outlive it goes to the repository's documents.

## Goal

<what done looks like, in two or three sentences>

## Core principles

1. <one line per rule that decides most questions; detail lives in `principles.md`>

## Documents

| File               | Read                                              | Write   |
| ------------------ | ------------------------------------------------- | ------- |
| `principles.md`    | after every compaction                            | rewrite |
| `dashboard.md`     | after every compaction                            | rewrite |
| `notepad.jsonl`    | after every compaction while it has lines         | append  |
| `orchestration.md` | before dividing work or starting a stage          | rewrite |
| `history.jsonl`    | only when a past decision or event is in question | append  |

## Maintenance

- While working, append one line to `notepad.jsonl` for anything that must not be lost.
- When a unit of work ends (a full round from planning through rework), hold a retrospective: distill the notepad into the documents above, append what happened to `history.jsonl`, refresh `dashboard.md`, then clear the notepad.
- A `rewrite` document is never appended to: read it whole, rewrite the sentence that already covers the matter, and delete a rule that a later one replaces.
- Keep this file within its size limit; what does not fit moves to `principles.md`.
```

Keep the four maintenance rules as written, and list in the table only the documents the set has.

## Restructuring an existing set

Do this only on the user's request.

1. Read every file of the set.
2. Sort each rule into the document the table above assigns it. Move sentences rather than rephrasing them, and lose none: count the rules before and after.
3. Put the current state of the work in `dashboard.md`, and narrative about how a rule arose in `history.jsonl` or nowhere.
4. Keep the original files until the user confirms the result, then delete them.
5. Check the set's status and fix every violation.
