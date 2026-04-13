# Setup Flow Reference

## Step 1: Instance URL

Ask user for their Atlassian instance URL:
- Cloud: `https://yourcompany.atlassian.net`
- Server/DC: `https://jira.yourcompany.com` or `https://confluence.yourcompany.com`

## Step 2: Environment Detection

- If hostname ends with `.atlassian.net` → Cloud
- Otherwise → Server/DC
- Inform user of detected environment

## Step 3: Auth Method Selection

Present options based on environment:

**Cloud options:**
1. Basic Auth (email + API token) — Recommended for personal use
2. OAuth 2.0 — For multi-user or granular access

**Server/DC options:**
1. PAT (Personal Access Token) — Recommended
2. Basic Auth (username + password)
3. OAuth 2.0

## Step 4: Credential Collection

Use the `setup` MCP tool to launch the local web server form.

## Step 5: Connection Test

Test both Jira and Confluence if configured:
- Jira: `GET /rest/api/{version}/myself`
- Confluence: `GET /rest/api/user/current` or `GET /api/v2/users/current`

## Step 6: Save

On success, credentials are encrypted and stored in `~/.claude/plugins/atlassian/`.
