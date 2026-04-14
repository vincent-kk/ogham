# atlassian-media-analysis — Tools Used, Agent Spawn & Caching

## Tools Used

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `fetch` | Download binary attachments with `accept_format: "raw"` and `save_to_path` parameter |

### Download Protocol

For Atlassian URL downloads, use the `fetch` MCP tool:

```
Tool: fetch (method: GET)
Params:
  url: <attachment-content-url>
  accept_format: "raw"
  save_to_path: ".temp/<filename>"
```

See [download-flow.md](../../atlassian-download/references/download-flow.md) for Jira/Confluence attachment URL resolution patterns.

## Agent Spawn

| Agent | When | Purpose |
|-------|------|---------|
| `media` | After scene-sieve extraction, when `--analyze` flag is set | Read frames sequentially (multimodal), classify scenes, generate analysis.json |

The `media` agent receives:
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
- No automatic cleanup (no deletion without user consent)
