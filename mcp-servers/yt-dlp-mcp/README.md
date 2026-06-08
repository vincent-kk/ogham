# @ogham/yt-dlp-mcp

> An MCP server that pulls **transcripts, metadata, comments, chapters, and media** from YouTube — and any other site [yt-dlp](https://github.com/yt-dlp/yt-dlp) supports — straight into Claude Desktop, Cursor, and other MCP apps.

You don't need Python, `brew`, `pip`, or yt-dlp itself. On the first request the server quietly downloads its own yt-dlp binary (checksum-verified) into `~/.yt-dlp/`, then reuses it. Works on Windows, macOS, and Linux.

## What you can do

- **Read a video without watching it** — pull a clean transcript, a metadata summary, chapters, or the "most replayed" heatmap.
- **Search and browse** — find videos by keyword, or list every entry in a playlist or channel.
- **Skim the discussion** — extract comments as JSON or as an easy-to-read threaded outline.
- **Save media** — download the video, just the audio, or the thumbnail (these are off by default — see [Turning tools on and off](#turning-tools-on-and-off)).

Everything goes through your MCP app's tool list — no terminal, no shell access required.

## Quick start

Add the server to your MCP app's config — for Claude Desktop that's `claude_desktop_config.json` — then restart the app. **Copy one of the three templates below to start;** you can change the `env` values and restart anytime.

The first tool call downloads the yt-dlp binary once (shared across all instances), so it may take a few extra seconds — every call after that is fast.

### Template 1 · Minimal

Just the five default tools: search, subtitle languages, transcript, metadata, and playlist. Nothing to switch on.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
    },
  },
}
```

### Template 2 · Reading & research

Adds the remaining read-only tools — metadata summary, raw subtitles, comments, chapters, and heatmap. Nothing is written to disk and **no ffmpeg is needed.** A good default for research and Q&A over videos.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
      "env": {
        "YTDLP_ENABLE_METADATA_SUMMARY": "1",
        "YTDLP_ENABLE_SUBTITLES": "1",
        "YTDLP_ENABLE_COMMENTS": "1",
        "YTDLP_ENABLE_COMMENTS_SUMMARY": "1",
        "YTDLP_ENABLE_CHAPTERS": "1",
        "YTDLP_ENABLE_HEATMAP": "1",
      },
    },
  },
}
```

### Template 3 · Everything

Every tool, including video / audio / thumbnail downloads. Install [**ffmpeg**](https://ffmpeg.org/download.html) on your `PATH` first — it's required for audio extraction and trimming. Note the [Legal](#legal) caveats before downloading.

```jsonc
{
  "mcpServers": {
    "yt-dlp": {
      "command": "npx",
      "args": ["-y", "@ogham/yt-dlp-mcp"],
      "env": {
        "YTDLP_ENABLE_ALL": "1",
      },
    },
  },
}
```

## Tools

**Five tools are on by default.** The rest stay hidden until you switch them on, so your app's tool list stays short and uncluttered. Every tool can be turned on or off with its own `YTDLP_ENABLE_<TOOL>` variable — see [Tool toggles](#tool-toggles).

### On by default

| Tool                            | What it does                                                                   | Main options                                                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `ytdlp_search_videos`           | Search YouTube by keyword, with pagination and an optional upload-date filter. | `query`, `maxResults` (1–50, default 10), `offset`, `uploadDateFilter` (`hour`/`today`/`week`/`month`/`year`) |
| `ytdlp_list_subtitle_languages` | List which subtitle/caption languages a video has (manual + auto-generated).   | `url`                                                                                                         |
| `ytdlp_download_transcript`     | Get a clean, readable plain-text transcript from a video's captions.           | `url`, `language` (default `YTDLP_DEFAULT_SUB_LANG`, else `en`), `timestamps`, `stripArtifacts`               |
| `ytdlp_get_video_metadata`      | Get curated video metadata as JSON (title, views, duration, upload date, …).   | `url`, `fields` (keep only the keys you ask for)                                                              |
| `ytdlp_get_playlist`            | List the entries of a playlist or channel (flat, no per-video download).       | `url`, `limit`                                                                                                |

> `ytdlp_download_transcript` returns cleaned readable plain text; `ytdlp_get_video_subtitles` returns raw subtitles with per-cue timestamps preserved.

### Opt-in (switch on with an environment variable)

| Tool                               | Turn on with                    | What it does                                                                                                                       |
| ---------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `ytdlp_get_video_subtitles`        | `YTDLP_ENABLE_SUBTITLES`        | Raw subtitles with timestamps preserved (one line per cue).                                                                        |
| `ytdlp_get_video_metadata_summary` | `YTDLP_ENABLE_METADATA_SUMMARY` | A short, human-readable overview of a video's key metadata.                                                                        |
| `ytdlp_get_comments`               | `YTDLP_ENABLE_COMMENTS`         | Comments as JSON or AI-friendly threaded Markdown.                                                                                 |
| `ytdlp_get_comments_summary`       | `YTDLP_ENABLE_COMMENTS_SUMMARY` | A quick readable digest of the top comments.                                                                                       |
| `ytdlp_get_chapters`               | `YTDLP_ENABLE_CHAPTERS`         | The video's chapter list (section markers with start times).                                                                       |
| `ytdlp_get_heatmap`                | `YTDLP_ENABLE_HEATMAP`          | The "most replayed" heatmap (engagement score per time span).                                                                      |
| `ytdlp_get_thumbnail` 💾           | `YTDLP_ENABLE_THUMBNAIL`        | Download the thumbnail as a JPG into your downloads folder.                                                                        |
| `ytdlp_download_video` 💾          | `YTDLP_ENABLE_DOWNLOAD_VIDEO`   | Download a video file. Options: `resolution` (`480p`/`720p`/`1080p`/`best`), `startTime`/`endTime` to trim. Trimming needs ffmpeg. |
| `ytdlp_download_audio` 💾          | `YTDLP_ENABLE_DOWNLOAD_AUDIO`   | Download just the audio track. Option: `audioFormat` (`m4a`/`mp3`). Needs ffmpeg.                                                  |

> 💾 = writes a file to disk. The download tools also touch the target platform's Terms of Service — see [Legal](#legal).

## Turning tools on and off

The [templates above](#quick-start) cover the common cases. To pick tools individually, set each one's `YTDLP_ENABLE_*` variable (see [Tool toggles](#tool-toggles)) inside the `env` block:

- Set it to `1` (or `true` / `yes` / `on`) to register the tool.
- Set it to `0` (or `false` / `no` / `off`) to hide a tool that is on by default.
- Leave it unset to use the tool's default (see [Tool toggles](#tool-toggles)).
- Set `YTDLP_ENABLE_ALL=1` to register every tool at once (overrides individual flags).

After changing any value, restart your MCP app so it re-reads the tool list.

## Configuration

Everything is configured through environment variables in the `env` block above — there are no config files to edit. **All of them are optional**; the defaults are sensible for everyday use. A copy of every variable lives in [`.env.example`](./.env.example).

### Tool toggles

Every tool has its own flag. Set it to `1` to turn the tool on, `0` to turn it off; leave it unset to use the **Default** shown below.

| Variable                               | Registers                          | Default |
| -------------------------------------- | ---------------------------------- | ------- |
| `YTDLP_ENABLE_SEARCH`                  | `ytdlp_search_videos`              | on      |
| `YTDLP_ENABLE_LIST_SUBTITLE_LANGUAGES` | `ytdlp_list_subtitle_languages`    | on      |
| `YTDLP_ENABLE_TRANSCRIPT`              | `ytdlp_download_transcript`        | on      |
| `YTDLP_ENABLE_METADATA`                | `ytdlp_get_video_metadata`         | on      |
| `YTDLP_ENABLE_PLAYLIST`                | `ytdlp_get_playlist`               | on      |
| `YTDLP_ENABLE_SUBTITLES`               | `ytdlp_get_video_subtitles`        | off     |
| `YTDLP_ENABLE_METADATA_SUMMARY`        | `ytdlp_get_video_metadata_summary` | off     |
| `YTDLP_ENABLE_COMMENTS`                | `ytdlp_get_comments`               | off     |
| `YTDLP_ENABLE_COMMENTS_SUMMARY`        | `ytdlp_get_comments_summary`       | off     |
| `YTDLP_ENABLE_CHAPTERS`                | `ytdlp_get_chapters`               | off     |
| `YTDLP_ENABLE_HEATMAP`                 | `ytdlp_get_heatmap`                | off     |
| `YTDLP_ENABLE_THUMBNAIL`               | `ytdlp_get_thumbnail`              | off     |
| `YTDLP_ENABLE_DOWNLOAD_VIDEO`          | `ytdlp_download_video`             | off     |
| `YTDLP_ENABLE_DOWNLOAD_AUDIO`          | `ytdlp_download_audio`             | off     |
| `YTDLP_ENABLE_ALL`                     | every tool (overrides all flags)   | —       |

### Where files go

| Variable              | Default                 | Purpose                                                    |
| --------------------- | ----------------------- | ---------------------------------------------------------- |
| `YTDLP_HOME`          | `~/.yt-dlp`             | Root folder for the binary, temp workspace, and downloads. |
| `YTDLP_DOWNLOADS_DIR` | `$YTDLP_HOME/downloads` | Override just the folder where downloads are saved.        |

### Binary acquisition

The server manages its own yt-dlp binary; these control how it picks and refreshes it.

| Variable               | Default | Purpose                                                                     |
| ---------------------- | ------- | --------------------------------------------------------------------------- |
| `YTDLP_COOLDOWN_DAYS`  | `3`     | Only adopt yt-dlp releases older than this many days (supply-chain safety). |
| `YTDLP_REFRESH_DAYS`   | `7`     | Re-check for a newer binary after this many days.                           |
| `YTDLP_PINNED_VERSION` | —       | Pin to one exact yt-dlp release tag (e.g. `2025.01.01`).                    |

### Response size & timeouts

| Variable                      | Default | Purpose                                                     |
| ----------------------------- | ------- | ----------------------------------------------------------- |
| `YTDLP_TIMEOUT_MS`            | `90000` | Time budget for a single extraction (milliseconds).         |
| `YTDLP_CHARACTER_LIMIT`       | `25000` | Max characters in a normal tool response before truncation. |
| `YTDLP_MAX_TRANSCRIPT_LENGTH` | `50000` | Max characters for transcript / subtitle responses.         |

### Language

| Variable                 | Default | Purpose                                                                                                                                                                                                                                                                           |
| ------------------------ | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `YTDLP_DEFAULT_SUB_LANG` | `en`    | Caption language for `ytdlp_download_transcript` / `ytdlp_get_video_subtitles` when the call omits `language`. Set it to your main content language (e.g. `ko`) so transcripts don't return empty — only one language is fetched per call, by design (timedtext is rate-limited). |
| `YTDLP_LANG`             | —       | Preferred language for titles / metadata. YouTube serves translated titles by interface language; set this (e.g. `ko`) to get originals from search / playlist / metadata. Never touches subtitle fetches, so it adds no rate-limit cost.                                         |

### Logging

| Variable          | Default | Purpose                                                                                  |
| ----------------- | ------- | ---------------------------------------------------------------------------------------- |
| `YTDLP_LOG_LEVEL` | `info`  | `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `silent`. Logs go to stderr only. |

### Rate limiting & proxies

| Variable                     | Default  | Purpose                                                                                                           |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- |
| `YTDLP_PROXY_POOL`           | —        | Comma-separated list of proxy URLs, rotated per request. The most effective fix for rate limits.                  |
| `YTDLP_PROXY`                | —        | A single proxy URL (used when no pool is set).                                                                    |
| `YTDLP_MAX_CONCURRENCY`      | adaptive | How many yt-dlp processes run at once (1–16). See below.                                                          |
| `YTDLP_REQUEST_INTERVAL_MS`  | adaptive | Minimum spacing between regular calls. See below.                                                                 |
| `YTDLP_SUBTITLE_INTERVAL_MS` | adaptive | Minimum spacing between subtitle/transcript calls. See below.                                                     |
| `YTDLP_COOKIES_FROM_BROWSER` | —        | Read cookies from a local browser profile (`BROWSER[:PROFILE][::CONTAINER]`, e.g. `chrome`). For auth gates only. |
| `YTDLP_COOKIES_FILE`         | —        | Path to a Netscape-format cookies file. Takes precedence over the browser option.                                 |

## Avoiding rate limits & blocks

YouTube rate-limits by IP address, and the limits add up over time — subtitle and transcript endpoints are the strictest, and once you trip a limit it can last from a few minutes up to about a day. If you see `[RATE_LIMITED]` or `[BLOCKED]` in a tool's response, here's what helps, most effective first:

1. **Use a rotating proxy pool (most effective).** Set `YTDLP_PROXY_POOL` to a comma-separated list of proxy URLs. The server rotates through them per request, spreading the load across IP addresses. A single `YTDLP_PROXY` is a lighter fallback.

2. **Let the server pace itself (automatic).** It already queues bursts and spaces out requests; single calls stay instant. The pacing **adapts automatically** to whether you've configured a proxy. You can override any value, but you rarely need to:

   | Proxy setup    | `YTDLP_MAX_CONCURRENCY` | `YTDLP_REQUEST_INTERVAL_MS` | `YTDLP_SUBTITLE_INTERVAL_MS` |
   | -------------- | ----------------------- | --------------------------- | ---------------------------- |
   | none           | 1                       | 1500                        | 4000                         |
   | single proxy   | 2                       | 750                         | 2000                         |
   | proxy pool (N) | `min(N, 8)`             | 0                           | 250                          |

3. **Cookies are for sign-in walls, not rate limits.** `YTDLP_COOKIES_FROM_BROWSER` / `YTDLP_COOKIES_FILE` unlock age-restricted, members-only, or sign-in-required videos. They rarely help with subtitle rate limits — reach for the proxy pool instead.

A `[BLOCKED]` bot-check often needs a Proof-of-Origin (PO) token; a cleaner proxy IP usually clears it more reliably than cookies do.

## Security & trust

- **Verified downloads.** The yt-dlp binary is only adopted after a cooldown (`YTDLP_COOLDOWN_DAYS`) and verified against the release's official `SHA2-256SUMS`. A mismatch is discarded; the bleeding-edge `releases/latest` is never fetched blindly.
- **Safe install.** The binary downloads to a temporary file, is checksum-verified, then atomically swapped in. A cross-process lock prevents duplicate or partial downloads.
- **Isolation.** Extraction happens in throwaway temp folders that get cleaned up; saved files stay under `~/.yt-dlp`. Tools only accept a fixed set of options — the underlying yt-dlp command flags are server-controlled, and there's no way to inject arbitrary shell commands.

## Legal

The cookie, proxy, and download/thumbnail features are **off by default**. Turning them on may implicate the target platform's Terms of Service and your local law (scraping rules, DMCA §1201, copyright). How you configure and use this server is your responsibility — please respect copyright and platform terms.

## License

MIT
