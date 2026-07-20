---
name: setup
user_invocable: true
description: '[entrez:setup] Configure NCBI tool/email and optional API key via a local web UI; check reachability. Trigger: "entrez setup", "configure pubmed", "set ncbi api key", "entrez 설정"'
argument-hint: "[--test] [--reset]"
version: "1.0.0"
complexity: simple
plugin: entrez
---

# setup — configuration & connectivity

Configure the NCBI identifiers (`tool`, `email`) and optional `api_key`, and
verify EInfo reachability. The api_key is handled entirely by a local web UI —
**never ask for it in chat**.

## Flow

1. Parse arguments:
   - `--test` → call `mcp__plugin_entrez_tools__auth_check` with `probeEInfo: true` and report
     status (configured, reachable, rate, db list). Skip the wizard.
   - `--reset` → call `mcp__plugin_entrez_tools__setup` with `mode: "new"` (overwrite).
   - no flags → call `mcp__plugin_entrez_tools__auth_check` first; if `configured: false` invoke
     `mcp__plugin_entrez_tools__setup` `mode: "new"`; if already configured, confirm with the
     user then invoke `mode: "edit"`.
2. The setup tool launches a local `127.0.0.1` web server and opens the browser
   automatically. The UI collects tool/email, optional api_key (masked on edit),
   default db, base URL, output path, date tag, and default date range, then
   tests the connection and saves on success.
3. Report the result from the tool response (`{ success, url }`). Do **not**
   request URL/email/api_key via chat — the web UI owns that.

## Storage & security

- Non-secret settings → `config.json`; `api_key` → `credentials.json` (0o600).
- The api_key never appears in chat, tool responses, logs, or the SearchManifest.

## Recovery

`auth_check` is the pre-flight and the recovery entry point (rate issues,
missing identifiers). See [`../_shared/mcp-tools.md`](../_shared/mcp-tools.md).
