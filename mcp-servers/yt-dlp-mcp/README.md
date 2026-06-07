# @ogham/yt-dlp-mcp

> MCP server for extracting YouTube (and any [yt-dlp](https://github.com/yt-dlp/yt-dlp)-supported site) **transcripts, metadata, comments, chapters, and media** — with a **yt-dlp binary it acquires itself** (cooldown-pinned + checksum-verified), so there is nothing to install on the host.

Built for shell-less MCP hosts (Claude Desktop, Cursor, …) where arbitrary shell access is unavailable and an MCP tool is the only safe channel to yt-dlp.

> [!NOTE]
> This document is a stub filled in during the hardening phase. See `docs/PLAN.md` and `docs/ARCHITECTURE.md` for the full design.

## Why this exists

Pure-HTTP transcript extraction is no longer reliable (poToken / BotGuard). yt-dlp solves the JS challenge itself and remains the one robust path. This server orchestrates yt-dlp instead of reimplementing it, and adds: automatic + safe binary acquisition, a consistent typed tool contract, conditional tool registration to keep the tool surface small, and path/option isolation.

## Quick start

```jsonc
// MCP host config (e.g. Claude Desktop)
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"]
    }
  }
}
```

The first tool call downloads a checksum-verified yt-dlp binary into `~/.yt-dlp/bin/` (one-time, shared across instances). No Python, no `brew`/`pip`/`winget`.

## Tools

Four tools are always on; the rest register only when their `YTDLP_ENABLE_*` flag is set (keeps the host's tool list lean). See `.env.example` for the full toggle list and `docs/ARCHITECTURE.md §7` for the catalog.

## Development

```bash
yarn yt-dlp-mcp build       # tsc → dist/ (+ executable bin)
yarn yt-dlp-mcp typecheck
yarn yt-dlp-mcp test:run    # unit + fixture + MCP contract (no network)
yarn yt-dlp-mcp test:e2e    # gated: real binary download + live YouTube
```

Network/binary e2e tests are skipped unless `RUN_NETWORK_TESTS=1` / `RUN_BINARY_TESTS=1`.

## License

MIT
