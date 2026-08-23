# Codex Custom Agent Reference

Use this reference only for the Codex host row selected from `../.shared/host-configuration.md`.

## Locations and Format

- Project scope: `.codex/agents/*.toml`
- User scope: `~/.codex/agents/*.toml` or the active `CODEX_HOME/agents/*.toml`
- One standalone TOML file defines one agent.
- The `name` field, not the filename, is the agent identity. Matching them is the clearest convention.

## Required Fields

```toml
name = "reviewer"
description = "Reviews changes for correctness, security, and missing tests."
developer_instructions = """
Review code like an owner.
Lead with concrete findings and cite the affected files.
Do not make changes unless the parent task authorizes implementation.
"""
```

All three fields are required and must be non-empty.

## Supported Optional Configuration

A custom agent file is a Codex configuration layer. It may include supported `config.toml` keys such as:

- `model`
- `model_reasoning_effort`
- `sandbox_mode`
- `mcp_servers`
- `skills.config`

Omitted settings inherit from the parent session or configured `[agents]` defaults. Add an override only when the role needs it.

Example read-only reviewer:

```toml
name = "reviewer"
description = "Read-only reviewer focused on correctness and test risk."
model_reasoning_effort = "high"
sandbox_mode = "read-only"
developer_instructions = """
Inspect the requested change without editing files.
Prioritize behavior regressions, unsafe assumptions, and missing verification.
Return findings in severity order with exact evidence.
"""
```

## Validation

- Parse as TOML; YAML frontmatter is invalid here.
- Require `name`, `description`, and `developer_instructions`.
- Confirm the selected path belongs to the current Codex project or user agent directory.
- Validate every optional key against the installed Codex configuration contract.
- Read the file back and report the actual path after a write.

Source: [official OpenAI Subagents documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
