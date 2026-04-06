# imbas-fetch-media — Tools Used, Agent Spawn & Caching

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `config_get` | Read media.temp_dir and media.scene_sieve_command from config |

### Jira Operations ([OP:])

| Tool | Usage |
|------|-------|
| `[OP: get_confluence]` | Resolve Confluence page to find attachment URLs |
| `[OP: fetch_attachment]` | Download binary attachments from Confluence/Jira URLs |

## Agent Spawn

| Agent | When | Purpose |
|-------|------|---------|
| `imbas-media` | After scene-sieve extraction, when `--analyze` flag is set | Read frames sequentially (multimodal), classify scenes, generate analysis.json |

The imbas-media agent receives:
- Absolute path to frames/ directory
- Absolute path to .metadata.json
- Analysis purpose context from caller
- Target path for analysis.json output

The agent reads each frame image via the Read tool (multimodal), builds scene descriptions,
and saves the structured analysis.json. The main agent context is never polluted with
frame image data — only the text summary is returned.

## Caching

- Same file path with existing analysis.json -> return cached result (skip extraction)
- Use `--force` flag to bypass cache and re-analyze
- `.temp/` directory is gitignored
- Manual cleanup via `/imbas:imbas-setup clear-temp`
- No automatic cleanup (no deletion without user consent)
