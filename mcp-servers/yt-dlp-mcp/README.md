# @ogham/yt-dlp-mcp

> MCP server for extracting YouTube (and any [yt-dlp](https://github.com/yt-dlp/yt-dlp)-supported site) **transcripts, metadata, comments, chapters, and media** — with a **yt-dlp binary it acquires itself** (cooldown-pinned + checksum-verified), so there is nothing to install on the host.

Built for shell-less MCP hosts (Claude Desktop, Cursor, …) where arbitrary shell access is unavailable and an MCP tool is the only safe channel to yt-dlp.

## Why this exists

Pure-HTTP transcript extraction is no longer reliable (poToken / BotGuard). yt-dlp solves the JS challenge itself and remains the one robust path. This server **orchestrates** yt-dlp instead of reimplementing it, and adds: automatic + safe binary acquisition, a consistent typed tool contract, conditional tool registration to keep the tool surface small, and path/option isolation.

## Quick start

```jsonc
// MCP host config (e.g. Claude Desktop)
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
    },
  },
}
```

The first tool call downloads a checksum-verified yt-dlp binary into `~/.yt-dlp/bin/` (one-time, shared across instances). No Python, no `brew`/`pip`/`winget`. Runs on Windows, macOS, and Linux.

> Some opt-in tools need extra binaries: `ytdlp_download_audio` and trimming in `ytdlp_download_video` require **ffmpeg** on `PATH`.

## Tools

Four tools are always on. The rest register only when their `YTDLP_ENABLE_*` flag is set, so the host's tool list stays lean.

| Tool                                                | Gate                                     |
| --------------------------------------------------- | ---------------------------------------- |
| `ytdlp_search_videos`                               | default                                  |
| `ytdlp_list_subtitle_languages`                     | default                                  |
| `ytdlp_download_transcript`                         | default                                  |
| `ytdlp_get_video_metadata`                          | default                                  |
| `ytdlp_get_video_subtitles`                         | `YTDLP_ENABLE_SUBTITLES`                 |
| `ytdlp_get_video_metadata_summary`                  | `YTDLP_ENABLE_METADATA_SUMMARY`          |
| `ytdlp_get_comments` / `ytdlp_get_comments_summary` | `YTDLP_ENABLE_COMMENTS`                  |
| `ytdlp_get_chapters`                                | `YTDLP_ENABLE_CHAPTERS`                  |
| `ytdlp_get_heatmap`                                 | `YTDLP_ENABLE_HEATMAP`                   |
| `ytdlp_get_thumbnail`                               | `YTDLP_ENABLE_THUMBNAIL` (writes a file) |
| `ytdlp_download_video` / `ytdlp_download_audio`     | `YTDLP_ENABLE_DOWNLOAD` (writes a file)  |
| `ytdlp_get_playlist`                                | `YTDLP_ENABLE_PLAYLIST`                  |

Set `YTDLP_ENABLE_ALL=1` to register everything at once.

## Configuration

All settings are environment variables (see [.env.example](./.env.example)); pass them via the host's `env` block.

| Variable                                            | Default                 | Purpose                                              |
| --------------------------------------------------- | ----------------------- | ---------------------------------------------------- |
| `YTDLP_HOME`                                        | `~/.yt-dlp`             | Root for `bin/`, `temp/`, `downloads/`               |
| `YTDLP_DOWNLOADS_DIR`                               | `$YTDLP_HOME/downloads` | Override download output dir                         |
| `YTDLP_COOLDOWN_DAYS`                               | `3`                     | Only adopt releases older than this (supply-chain)   |
| `YTDLP_REFRESH_DAYS`                                | `7`                     | Refresh the cached binary after this many days       |
| `YTDLP_PINNED_VERSION`                              | —                       | Pin to an exact yt-dlp tag                           |
| `YTDLP_MAX_CONCURRENCY`                             | adaptive                | Concurrent yt-dlp child processes (see below)        |
| `YTDLP_REQUEST_INTERVAL_MS`                         | adaptive                | Min spacing between light/metadata calls (see below) |
| `YTDLP_SUBTITLE_INTERVAL_MS`                        | adaptive                | Min spacing between subtitle/transcript calls        |
| `YTDLP_TIMEOUT_MS`                                  | `90000`                 | Per-extraction timeout                               |
| `YTDLP_CHARACTER_LIMIT`                             | `25000`                 | Response truncation limit                            |
| `YTDLP_MAX_TRANSCRIPT_LENGTH`                       | `50000`                 | Transcript/subtitle truncation limit                 |
| `YTDLP_LOG_LEVEL`                                   | `info`                  | `trace`…`fatal`/`silent` (stderr only)               |
| `YTDLP_PROXY_POOL` / `YTDLP_PROXY`                  | —                       | Rotating / single proxy — primary 429 mitigation     |
| `YTDLP_COOKIES_FROM_BROWSER` / `YTDLP_COOKIES_FILE` | —                       | Cookies for auth gates only (opt-in; see Legal)      |

### Avoiding rate limits & blocks

YouTube rate limits (HTTP 429) are **IP-based and cumulative** — subtitle/`timedtext` endpoints are the most aggressive, and a tripped limit can persist from minutes up to ~24h. Mitigation effectiveness, in order:

1. **Rotating proxy (primary).** Set `YTDLP_PROXY_POOL` to a comma-separated list of proxy URLs. They are round-robined per request, spreading load across IPs. A single static `YTDLP_PROXY` is the fallback when no pool is set.
2. **Request pacing.** The server queues bursts and spaces dispatches; single calls stay instant. Concurrency and the spacing intervals **auto-adapt to proxy state**, and each can be overridden via env:

   | proxy state | `YTDLP_MAX_CONCURRENCY` | `YTDLP_REQUEST_INTERVAL_MS` | `YTDLP_SUBTITLE_INTERVAL_MS` |
   | ----------- | ----------------------- | --------------------------- | ---------------------------- |
   | none        | 1                       | 1500                        | 4000                         |
   | single      | 2                       | 750                         | 2000                         |
   | pool (N)    | `min(N, 8)`             | 0                           | 250                          |

3. **Cookies — auth gates only.** `YTDLP_COOKIES_FROM_BROWSER` / `YTDLP_COOKIES_FILE` unlock age-restricted, members-only, or sign-in-walled content. They **rarely help** with subtitle 429s — reach for the proxy pool instead.

A `[BLOCKED]` bot-check often needs a **Proof-of-Origin (PO) token**; cookies alone may not clear it, whereas a cleaner proxy IP frequently does.

## Security & supply chain

- **Cooldown pin + checksum**: releases are selected only after `YTDLP_COOLDOWN_DAYS` have passed, then verified against the release's `SHA2-256SUMS`. Mismatches are discarded. `releases/latest` is never fetched directly.
- **Atomic, locked install**: the binary downloads to a per-attempt unique staging file, is checksum-verified, then atomically renamed; a cross-process lock plus in-process dedupe prevent duplicate downloads.
- **Isolation**: extraction works in throwaway temp dirs (cleaned up); downloads stay under `~/.yt-dlp`. Tools accept only whitelisted arguments — yt-dlp flags are server-fixed and `--exec`-style options are never exposed.
- **stdio integrity**: all logs go to stderr; stdout carries only JSON-RPC.

## Legal / Terms of Service

Cookies, proxy, and the download/thumbnail tools are **off by default**. Enabling them may implicate the target platform's Terms of Service and local law (scraping, DMCA §1201). You are responsible for how you configure and use this server. Respect copyright and platform terms.

## Development

```bash
yarn yt-dlp-mcp build       # tsc -> dist/ (+ executable bin)
yarn yt-dlp-mcp typecheck
yarn yt-dlp-mcp test:run    # unit + fixture + MCP contract (no network)
yarn yt-dlp-mcp test:e2e    # gated: real binary download + live YouTube
```

The architecture injects `Runner` / `BinaryManager` ports, so every failure path is testable without the real binary. Network/binary e2e tests are skipped unless `RUN_NETWORK_TESTS=1` / `RUN_BINARY_TESTS=1` (override the target video with `YTDLP_E2E_URL`).

See `docs/PLAN.md` and `docs/ARCHITECTURE.md` for the full design.

## License

MIT
