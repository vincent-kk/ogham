---
name: imbas-fetch-media
user_invocable: true
description: >
  Download images, videos, and GIFs from Confluence/Jira. For video/GIF files,
  extracts keyframes using scene-sieve and runs semantic analysis via imbas-media agent.
  Trigger: "download media", "미디어 다운로드", "fetch attachment", "영상 분석"
version: "1.1.0"
complexity: moderate
plugin: imbas
---

# imbas-fetch-media — Media Download & Analysis

Download images, videos, and GIFs from Atlassian sources or local paths. For video/GIF files,
extracts visually meaningful keyframes via scene-sieve and runs semantic analysis through
the imbas-media subagent to produce a structured analysis.json.

## When to Use This Skill

- User wants to understand visual content attached to Confluence pages or Jira issues
- Downloading and analyzing screen recordings, demo videos, or GIF animations
- Extracting keyframes from video attachments for LLM comprehension
- Pre-processing media before running imbas:digest or imbas:validate

## Arguments

```
/imbas:fetch-media <url-or-path> [--analyze] [--preset <name>] [--force]

<url-or-path>  : Confluence attachment URL, Jira attachment URL, or local file path
--analyze      : For video/GIF, run scene-sieve extraction + imbas-media analysis
--preset       : scene-sieve preset override (default: auto-detect from extension/duration)
--force        : Force re-analysis even if cached analysis.json exists
```

## Complete Workflow

```
Step 1 — Resolve input
  - URL pattern detection:
    - Confluence attachment URL -> Atlassian download
    - Jira attachment URL -> Atlassian download
    - Local file path -> use directly
  - Validate file exists (URL or path)

Step 2 — Download (if Atlassian URL)
  - Call Atlassian MCP: fetchAtlassian(url)
  - Save binary to .imbas/.temp/<filename>
  - If download fails -> error with auth check guidance

Step 3 — Probe and select preset
  - Run: node "<skill-dir>/scripts/probe.mjs" "<file>" [intent]
  - Parse JSON output for: type, duration, resolution, preset, command
  - If probe returns type=image -> Step 4 (image path)
  - If probe returns type=video -> Step 5 (video path)
  - See presets/index.md for the full decision matrix

Step 4 — Image handling (no scene-sieve)
  - If Atlassian URL: file already in .imbas/.temp/<filename>/
  - If local file: copy to .imbas/.temp/<filename>/
  - Return file path to caller
  - Caller reads the image directly via Read tool (multimodal)
  - No subagent needed. Skill completes here.

Step 5 — Video/GIF handling
  a. Resolve temp directory:
     - Read config: imbas_config_get("media.temp_dir") -> default ".temp"
     - Target dir: .imbas/.temp/<filename>/

  b. Check cache:
     - If .imbas/.temp/<filename>/analysis.json exists AND no --force flag
       -> Return cached analysis summary
       -> Skip extraction and analysis

  c. Extract keyframes:
     - Use the `command` field from probe output directly
     - Append: -o "<temp_dir>/<filename>/frames" 2>/dev/null
     - Parse output: check ok field, collect outputFiles list
     - Results: frame_*.jpg files + .metadata.json in frames/ directory

  d. Spawn imbas-media agent for analysis (if --analyze flag):
     - Pass to agent:
       - frames directory absolute path
       - .metadata.json absolute path
       - analysis purpose/context from caller
       - analysis.json save path: .imbas/.temp/<filename>/analysis.json
     - Agent performs:
       1. Read .metadata.json -> frame list + timestamps
       2. Read frames sequentially (multimodal image recognition)
       3. Classify scenes + generate descriptions
       4. Save analysis.json
       5. Return summary text

  e. Return result:
     - With --analyze: analysis.json summary text
     - Without --analyze: frames directory path + frame count
     - Caller consumes only text summary — frame images stay in subagent context
```

## Preset Auto-Selection

The probe script (`scripts/probe.mjs`) selects a preset by this priority:

1. User provides `--preset <name>` -> use that preset directly
2. Extension `.gif` -> `gif` preset
3. Extension is image (`.png`, `.jpg`, `.jpeg`, `.svg`, `.webp`) -> image path (no extraction)
4. Duration-based (from ffprobe or file-size fallback):
   - <= 30s -> `short-clip`
   - <= 5min -> `medium-video`
   - <= 30min -> `long-video`
   - > 30min -> `very-long`
5. Intent override keywords:
   - "quick glance" / "summary" -> `quick-glance`
   - "detailed" / "thorough" -> `detailed`
   - "high quality" / "screenshot" -> `hq-capture`
   - "bug" / "inspection" -> `inspection`
   - "screen recording" / "walkthrough" -> `screen-recording`

See [presets/index.md](./presets/index.md) for the full decision matrix and all 10 preset definitions.

## File Structure

```
.imbas/.temp/
└── login-demo.mp4/
    ├── frames/
    │   ├── frame_0001.jpg
    │   ├── frame_0003.jpg
    │   ├── frame_0007.jpg
    │   └── .metadata.json
    └── analysis.json
```

## Tools Used

### imbas MCP Tools

| Tool | Usage |
|------|-------|
| `imbas_config_get` | Read media.temp_dir and media.scene_sieve_command from config |

### Atlassian MCP Tools

| Tool | Usage |
|------|-------|
| `getConfluencePage` | Resolve Confluence page to find attachment URLs |
| `fetchAtlassian` | Download binary attachments from Confluence/Jira URLs |

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
- Manual cleanup via `/imbas:setup clear-temp`
- No automatic cleanup (no deletion without user consent)

## Resources

- [scripts/probe.mjs](./scripts/probe.mjs) — Video probe + preset auto-selection script (run before extraction, cross-platform)
- [presets/index.md](./presets/index.md) — Decision matrix and summary table for preset selection
  - [short-clip.md](./presets/short-clip.md) — <= 30s clips
  - [medium-video.md](./presets/medium-video.md) — 30s-5min videos
  - [long-video.md](./presets/long-video.md) — 5-30min videos
  - [very-long.md](./presets/very-long.md) — > 30min videos
  - [gif.md](./presets/gif.md) — GIF animations
  - [quick-glance.md](./presets/quick-glance.md) — Fast summary
  - [detailed.md](./presets/detailed.md) — Thorough analysis
  - [hq-capture.md](./presets/hq-capture.md) — High-quality screenshots
  - [inspection.md](./presets/inspection.md) — Visual bug detection
  - [screen-recording.md](./presets/screen-recording.md) — UI walkthroughs
- [reference.md](./reference.md) — Complete flag reference (14 flags), JSON output schemas, error codes, troubleshooting
