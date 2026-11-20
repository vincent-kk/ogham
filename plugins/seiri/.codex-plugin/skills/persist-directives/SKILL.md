---
name: persist-directives
user-invocable: true
disable-model-invocation: true
description: 'Register local instructions to restore after context compaction, reconnect a named set, or manage a registered set.'
argument-hint: '[set | on SET | off SET | status SET | remove SET | instructions]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# persist-directives



Use the absolute repository root. Store each set under `.seiri/directives/<set>/`, using a kebab-case name that matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Keep the directives in one or more UTF-8 text files. The runtime manages the binding record and lock.

## Connect a set

- If the argument is one existing set name, read its directive files into this session, skipping binding records, lock directories, temporary files, and symbolic links. Bind the set again.
- Otherwise, write the user's instructions into a named set. When the user has supplied no directive text, draft it from the conversation and confirm it with the user before writing. Use `session` unless the user requests `all`, which covers every main session in this checkout.
- Bind with `mcp__seiri__runtime({ action: "directives", directives_op: "bind", project_root, set, scope })`. Repeat any ignore warning so the user knows whether the set could be committed.
- On `dial_low`, tell the user the files are saved and the current dial prevents binding and injection after compaction. Ask them to raise the dial to at least `standard`, then rerun this skill with the set name. Leave the dial unchanged.
- On `accepted`, check for the native `[seiri] Directives <set> bound (scope <scope>, <n> files)` acknowledgment. If there is no acknowledgment, report that the set did not bind.
- If `estimatedMode` is `pointer`, explain that the set is estimated to exceed the context limit. After compaction the hook will provide the set directory path and ask the session to reread its files except `binding.json`.

## Manage a set

For `on SET`, `off SET`, `status SET`, or `remove SET`, pass that operation as `directives_op` on the same runtime action with `project_root` and `set`. Report the result, including a low dial reported by status. `remove` deletes the set's files and binding. Keep all changes in seiri's local directive store and leave host configuration untouched.
