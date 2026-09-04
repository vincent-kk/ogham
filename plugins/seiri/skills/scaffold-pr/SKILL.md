---
name: scaffold-pr
user-invocable: true
disable-model-invocation: true
description: 'Open an empty Draft PR before work starts — branch, empty commit, placeholder title and body to rewrite as changes land.'
argument-hint: '[purpose] [--base BRANCH] [--ready]'
version: '0.1.0'
complexity: simple
plugin: seiri
---

# scaffold-pr — the PR exists before the work does

You were invoked by the user. Decide three things — branch, title, body — and hand the git/gh sequence to the bundled script; never replay its steps as raw commands.

> **Script resolution**: resolve through `${CLAUDE_PLUGIN_ROOT}`; when unset, locate with `Glob(**/skills/scaffold-pr/scripts/scaffold-pr.mjs)`. Not found: abort with an error.

## Workflow

**1. Preflight.**

```
node "${CLAUDE_PLUGIN_ROOT}/skills/scaffold-pr/scripts/scaffold-pr.mjs" --check
```

The reply is one JSON line: repo root, resolved base, dirty files — or a stable failure code (`GIT_MISSING`, `NOT_A_REPO`, `GH_MISSING`, `GH_UNAUTHENTICATED`, `BASE_RESOLVE_FAILED`). Failures stop here, reported plainly. Dirty files: name them, ask whether to continue — the scaffold call then carries `--allow-dirty`; never stash or commit them.

**2. Ask the purpose — once.** A non-option purpose argument is the answer. Options alone are not a purpose. Without a purpose, use one AskUserQuestion: "Generate with defaults (Recommended)" · feature · fix · chore, plus free text via Other. Preserve supplied options, then from that single purpose input derive commit type, branch `<type>/<slug>` (lowercase ASCII, hyphens; translate non-ASCII purposes; no-input default `chore/scaffold-<n>`), PR title, and body.

**3. Write the body only when it has content.** Fill `.github/PULL_REQUEST_TEMPLATE.md` when the repository has one, Write it to a scratch file, and pass `--body-file`. Omit the flag to get the script's built-in placeholder body.

**4. Scaffold.**

```
node "${CLAUDE_PLUGIN_ROOT}/skills/scaffold-pr/scripts/scaffold-pr.mjs" --branch <type>/<slug> --title "<title>" [--body-file <path>] [--base <branch>] [--type <commit-type>] [--ready] [--allow-dirty]
```

Success returns `{ok, url, branch, base, existing}` — `existing: true` means an open PR was found and reused, not duplicated. `BRANCH_EXISTS`: ask — rerun with `--reuse-branch` or pick another name. Remaining codes (`SWITCH_FAILED`, `PULL_FAILED`, `COMMIT_FAILED`, `PUSH_FAILED`, `PR_LOOKUP_FAILED`, `PR_CREATE_FAILED`) carry the underlying stderr: report and stop — no raw-git recovery.

**5. Hand back one line.** PR URL, branch, base — and a reminder that title and body await real content.

## Rules

- The script owns sequencing, quoting, and idempotence; it is cross-platform by construction (argv spawn, no shell). Draft is the default; `--ready` is the sole exception.
- Git state only — branch, empty commit, push, PR. No source edits, no stash, no force-push, no labels, reviewers, milestones, or issue links.
- Counterpart: `/seiri:finish` closes the branch this skill opens.
