---
name: setup
user-invocable: true
disable-model-invocation: true
description: "Configure or test the Jira/Confluence connection — site URL and Basic (email + API token, username + password) or PAT credentials for Cloud and Server/DC, through a local browser wizard. Use for first-time setup, HTTP 401 recovery, or /atlassian:setup --test."
argument-hint: "[--test] [--reset]"
version: "0.2.1"
complexity: moderate
plugin: atlassian
---

# setup

Credentials are collected in a browser page served on `127.0.0.1`, never in chat — do not ask the user for URLs, tokens, or passwords.

## Flow

| Invocation | Action                                                                                                                                                                |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--test`   | `mcp__plugin_atlassian_tools__auth_check` with `connection_test: true`; report per-site `connection.success`, `message`, `latency_ms`, and the Jira `user`. No wizard |
| `--reset`  | `mcp__plugin_atlassian_tools__setup` with `mode: "new"` — opens the wizard; the configuration is replaced when the user saves                                         |
| no flag    | Follow [Authentication check](#authentication-check); not configured → `setup` with `mode: "new"`; configured → confirm, then `mode: "edit"`                          |

The setup tool opens the browser and returns once the wizard saves successfully (Save & Close also shuts the local server down) or, as a failure, after 5 minutes without activity. `mode` only labels the result message. On success report `config_path` verbatim (it reflects the user/project scope chosen in the browser); on failure report the message and never guess a path.

## Authentication check

For the no-flag flow, call `mcp__plugin_atlassian_tools__auth_check` with `connection_test: true`.

- `authenticated: false` → run the wizard.
- `authenticated: true` → show the configured sites and ask before reconfiguring, in the user's language:

  ```
  The following Atlassian sites are configured:
  - Jira: {base_url} ({user.displayName}, {user.emailAddress})
  - Confluence: {base_url}
  Replace this configuration?
  ```

Response: `{ authenticated, services: { jira?: Site[], confluence?: Site[] } }`. `authenticated` means "at least one site is configured", not that credentials are valid.

`Site`: `{ configured, base_url, connection?: { success, message, latency_ms }, user?: { displayName, emailAddress } | null }`. `connection` is present only with `connection_test: true`; `user` is filled only for Jira on a successful test. Credentials never appear in the response.

On a successful test, `connection.message` reads `Connected to <service> (Cloud | Server)`, reporting the detected deployment.

## Auth methods

Two credential slots per site, chosen implicitly in the wizard: a username makes it Basic, an empty username makes the token a Bearer PAT.

| Deployment | Basic               | Bearer                |
| ---------- | ------------------- | --------------------- |
| Cloud      | email + API token   | —                     |
| Server/DC  | username + password | personal access token |

Base URL is the site root (`https://x.atlassian.net`, `https://jira.example.com/jira`) — never append `/wiki`. Cloud API tokens are issued at `https://id.atlassian.com/manage-profile/security/api-tokens`.

## Errors

| Symptom                       | Meaning                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| `ENOTFOUND` / `ECONNREFUSED`  | Hostname or network (VPN, firewall) — fix the URL or connectivity       |
| 401 on test                   | Wrong credentials — re-enter the token/password                         |
| 403 with CAPTCHA (Server/DC)  | Too many failed logins — sign in once in a browser to clear it          |
| Self-signed certificate error | Certificate must be trusted by the OS/Node; the wizard cannot bypass it |
