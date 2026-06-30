---
name: setup
description: '[cennad] Open the local settings UI for ratio, intervention strength, keywords, and defaults. Trigger: "cennad 설정", "open cennad settings", "개입 강도"'
user_invocable: true
argument-hint: ''
---

# setup

Open the cennad settings UI in a local browser.

## Steps

1. Call `mcp__plugin_cennad_tools__open_settings` with no arguments.
2. Output the response's `url` field to the user.
3. If the response's `reused` is `true`, tell the user the existing settings server was reused (5-minute idle window) and ask them to refresh the existing browser tab. No browser launch happens on the reused path.
4. If `reused` is `false`, the MCP server attempts to launch the URL in the user's default browser. In headless environments or if the launcher fails, ask the user to open the URL manually.

## Do not

- Ask the user for URLs, model names, API keys, ratios, keywords, or any other setting — the web UI collects all of it.
- Call any other cennad tool from this skill.
- Mention the token query parameter; it is opaque to the user.
