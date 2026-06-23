---
name: setup
description: '[deilen] Open the local settings UI to configure theme, auto-open, timeouts, renderer toggles, and size limits. Trigger: "deilen settings", "open deilen settings", "change the viewer theme", "deilen 설정"'
user_invocable: true
argument-hint: ""
---

# setup

Open the deilen settings UI in a local browser.

## Steps

1. Call `mcp_tools_open_settings` with no arguments.
2. Give the user the response's `url`. The page also opens automatically; in a
   headless environment or if the launcher fails, ask the user to open the URL
   themselves.
3. The user edits theme, auto-open, timeouts, renderer toggles, and size limits
   in the page and clicks **Save settings**. Settings apply to subsequent
   renders.

## Notes

- Reply to the user in their own language.

## Do not

- Ask the user for theme, timeout, port, or any other value — the web UI
  collects all of it.
- Call any other deilen tool from this skill.
- Mention or expose the `token` query parameter — it is opaque to the user.
