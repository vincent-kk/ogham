# setupVault

## Purpose

Connect an explicitly selected vault to the current project's MCP host during onboarding.

## Boundaries

### Always do

- Use the public project MCP manager with owner `maencof` and revision checks.
- Locate the server beside the distributed CLI bundle.

### Ask first

- Replacing foreign or drifted configuration requires a separate conflict resolution.

### Never do

- Write user-scope settings, knowledge documents, or settings from SessionStart.
- Expose configuration contents or inherited environment variables in CLI output.
