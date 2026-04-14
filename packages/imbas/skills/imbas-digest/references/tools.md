# imbas-digest — Tools Used & Agent Spawn

Provider-specific publish tools live in `jira/tools.md` and `local/tools.md`.
This file lists shared tools and delegated skills.

## Shared tools (all providers)

| Tool | Usage |
|------|-------|
| `config_get` | Read `config.provider` to route Step 6 to the correct publish path |

## Delegated skills

| Skill | When | Provider |
|-------|------|----------|
| `imbas:read-issue` | Step 1 — load structured issue context | all |
| `/atlassian:atlassian-media-analysis` | Step 1 — analyze attached images/videos/GIFs | jira only (v1) |

## Agent Spawn

No direct agent spawn. Digest delegates to other skills only.
