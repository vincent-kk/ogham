---
name: persist-directives
user-invocable: true
description: 'Keep working directives for a long workflow across context compactions: create or reconnect a directive set, maintain its documents, or manage its binding.'
argument-hint: '[set | on SET | off SET | status SET | remove SET | instructions]'
version: '0.2.0'
complexity: simple
plugin: seiri
---

# persist-directives



A directive set is the working knowledge one agent carries through a long workflow, across every compaction of its context. It belongs to that workflow: what must outlive it goes to the repository's own documents.

Use the absolute repository root. Store each set under `.seiri/directives/<set>/`, using a kebab-case name that matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`. The runtime manages the binding record and lock; the other files are yours and the user's to write.

## Who starts what

- Only on the user's request: create a set, restructure a set that has no `index.md`, `remove` a set, bind with scope `all`.
- On your own, for a bound set that has an `index.md`: hold retrospectives, distill, split a document that outgrew its limit, add an extension document, fix reported violations. The set's maintenance rules are the standing instruction.

## Connect a set

- If the argument is one existing set name, read its `index.md` and the documents that entry marks as read after compaction. In a set without `index.md`, read every directive file, skipping binding records, lock directories, temporary files, and symbolic links. Bind the set again.
- Otherwise create the set: read [structure](references/structure.md) and write its documents from the user's instructions. When the user has supplied no directive text, draft it from the conversation and confirm it with the user before writing. Use `session` unless the user requests `all`, which covers every main session in this checkout.
- Bind with `mcp__seiri__runtime({ action: "directives", directives_op: "bind", project_root, set, scope })`. Repeat any ignore warning so the user knows whether the set could be committed.
- On `dial_low`, tell the user the files are saved and the current dial prevents binding and injection after compaction. Ask them to raise the dial to at least `standard`, then rerun this skill with the set name. Leave the dial unchanged.
- On `accepted`, check for the native `[seiri] Directives <set> bound (scope <scope>, <n> files)` acknowledgment. If there is no acknowledgment, report that the set did not bind.
- After compaction the hook injects `index.md` whole and names the documents to read next. If `estimatedMode` is `pointer`, the entry is over its limit or the set is too large to inject: the hook will give the set directory instead and ask the session to read `index.md` first.

## Maintain a set

Read [maintenance](references/maintenance.md) before a retrospective or any edit to a set's documents, and [structure](references/structure.md) before adding or splitting a document.

- Append to the notepad or the history with `directives_op: "append"`, adding `log` (`notepad` or `history`) and `text` to the same runtime call. The runtime stamps the time; never append to those files by hand.
- End every retrospective with `directives_op: "status"`: fix each entry in `violations`, and empty the notepad once its `notepadLines` are distilled.

## Manage a set

For `on SET`, `off SET`, `status SET`, or `remove SET`, pass that operation as `directives_op` on the same runtime action with `project_root` and `set`. Report the result, including a low dial reported by status. `remove` deletes the set's files and binding. Keep all changes in seiri's local directive store and leave host configuration untouched.
