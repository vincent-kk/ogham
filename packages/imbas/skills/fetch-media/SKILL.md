---
name: imbas-fetch-media
user_invocable: true
description: >
  Download images, videos, and GIFs from Confluence/Jira. For video/GIF files,
  extracts keyframes using scene-sieve and runs semantic analysis via imbas-media agent.
  Trigger: "download media", "미디어 다운로드", "fetch attachment", "영상 분석"
version: "1.0.0"
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
--preset       : scene-sieve preset override (default: auto-detect from duration)
--force        : Force re-analysis even if cached analysis.json exists
```

## Complete Workflow

```
Step 1 — Resolve input
  - URL pattern detection:
    - Confluence attachment URL → Atlassian download
    - Jira attachment URL → Atlassian download
    - Local file path → use directly
  - Validate file exists (URL or path)

Step 2 — Download (if Atlassian URL)
  - Call Atlassian MCP: fetchAtlassian(url)
  - Save binary to .imbas/.temp/<filename>
  - If download fails → error with auth check guidance

Step 3 — Detect type by extension
  - Image: .png, .jpg, .jpeg, .svg, .webp → Step 4 (image path)
  - Video: .mp4, .mov, .avi, .mkv, .webm → Step 5 (video path)
  - GIF: .gif → Step 5 (video path)
  - Unknown extension → INVALID_FORMAT error

Step 4 — Image handling (no scene-sieve)
  - If Atlassian URL: file already in .imbas/.temp/<filename>/
  - If local file: copy to .imbas/.temp/<filename>/
  - Return file path to caller
  - Caller reads the image directly via Read tool (multimodal)
  - No subagent needed. Skill completes here.

Step 5 — Video/GIF handling
  a. Resolve temp directory:
     - Read config: imbas_config_get("media.temp_dir") → default ".temp"
     - Target dir: .imbas/.temp/<filename>/

  b. Check cache:
     - If .imbas/.temp/<filename>/analysis.json exists AND no --force flag
       → Return cached analysis summary
       → Skip extraction and analysis

  c. Probe video:
     - Run: npx -y @lumy-pack/scene-sieve "<file>" --json --describe 2>/dev/null
     - Parse JSON output for: duration, resolution, format info
     - If probe fails (no ffprobe): use file size heuristic for duration estimate

  d. Auto-select preset from probe result (see Preset Selection below)

  e. Extract keyframes:
     - Build command from preset flags
     - Run: npx -y @lumy-pack/scene-sieve "<file>" --json <preset-flags> -o "<temp_dir>/<filename>/frames" 2>/dev/null
     - Parse output: check ok field, collect outputFiles list
     - Results: frame_*.jpg files + .metadata.json in frames/ directory

  f. Spawn imbas-media agent for analysis (if --analyze flag):
     - Pass to agent:
       - frames directory absolute path
       - .metadata.json absolute path
       - analysis purpose/context from caller
       - analysis.json save path: .imbas/.temp/<filename>/analysis.json
     - Agent performs:
       1. Read .metadata.json → frame list + timestamps
       2. Read frames sequentially (multimodal image recognition)
       3. Classify scenes + generate descriptions
       4. Save analysis.json
       5. Return summary text

  g. Return result:
     - With --analyze: analysis.json summary text
     - Without --analyze: frames directory path + frame count
     - Caller consumes only text summary — frame images stay in subagent context
```

## scene-sieve Integration (ADR 4)

### Preset Auto-Selection Decision Tree

1. If user provides `--preset <name>` → use that preset directly
2. If `.gif` extension → use `gif` preset
3. Duration-based (from probe result):
   - Duration <= 30s → `short-clip`
   - Duration <= 5min → `medium-video`
   - Duration <= 30min → `long-video`
   - Duration > 30min → `very-long`
4. Intent override: user can specify intent keyword to override duration-based selection:
   - "quick glance" / "summary" → `quick-glance`
   - "detailed" / "thorough" → `detailed`
   - "high quality" / "screenshot" → `hq-capture`
   - "bug" / "inspection" → `inspection`
   - "screen recording" / "walkthrough" → `screen-recording`

### All 10 Presets

| Preset | `-n` | `-t` | `--fps` | `--max-frames` | `--scale` | `-q` | Other |
|--------|------|------|---------|----------------|-----------|------|-------|
| short-clip | 8 | 0.5 | 5 | 300 | 720 | 85 | — |
| medium-video | 12 | 0.5 | 5 | 300 | 720 | 80 | — |
| long-video | 15 | 0.5 | 2 | 200 | 480 | 80 | — |
| very-long | 20 | 0.5 | 1 | 150 | 480 | 80 | `--concurrency 1` |
| gif | 10 | 0.3 | 5 | 50 | 720 | 80 | — |
| quick-glance | 5 | 0.5 | 2 | 300 | 480 | 80 | — |
| detailed | 30 | 0.2 | 10 | 300 | 720 | 80 | — |
| hq-capture | 8 | 0.5 | 5 | 300 | 1080 | 95 | — |
| inspection | 20 | 0.15 | 5 | 300 | 720 | 80 | `-it 0.7 -at 3` |
| screen-recording | 12 | 0.3 | 2 | 300 | 720 | 80 | — |

### All 14 CLI Flags

| Flag | Short | Description | Type | Default |
|------|-------|-------------|------|---------|
| `--count` | `-n` | Max frames to keep | number | 20 |
| `--threshold` | `-t` | Normalized score cutoff (0-1) | number | 0.5 |
| `--output` | `-o` | Output directory | string | same as input |
| `--fps` | `--fps` | Max FPS for frame extraction | number | 5 |
| `--max-frames` | `-mf` | Max frames to extract (auto-reduces FPS for long videos) | number | 300 |
| `--scale` | `-s` | Scale size for vision analysis (px) | number | 720 |
| `--quality` | `-q` | JPEG output quality (1-100) | number | 80 |
| `--iou-threshold` | `-it` | IoU threshold for animation tracking (0-1) | number | 0.9 |
| `--anim-threshold` | `-at` | Min consecutive frames to classify as animation | number | 5 |
| `--max-segment-duration` | — | Max segment duration for long video splitting (sec) | number | 300 |
| `--concurrency` | — | Parallel segment processing count | number | 2 |
| `--debug` | — | Preserve temp workspace for inspection | boolean | false |
| `--json` | — | Structured JSON output to stdout | boolean | false |
| `--describe` | — | Output JSON schema of available options | boolean | false |

### ffprobe Fallback

When ffprobe is unavailable, scene-sieve probe falls back to file size heuristic:

| File Size | Estimated Duration | Preset |
|-----------|--------------------|--------|
| < 5 MB | Short clip | short-clip |
| 5-50 MB | Medium (~30s-5min) | medium-video |
| 50-500 MB | Long (~5-30min) | long-video |
| > 500 MB | Very long (>30min) | very-long |

### Frame Output Naming

Output frames follow the pattern `frame_NNNN.jpg` (zero-padded 4 digits).
Gaps in numbering are normal — they indicate pruned frames.
Example: `frame_0001.jpg`, `frame_0003.jpg`, `frame_0007.jpg` means frames 2, 4-6 were pruned.

### .metadata.json Schema

Written alongside output frames in the frames/ directory:

```json
{
  "video": {
    "originalDurationMs": 19218,
    "fps": 5,
    "resolution": { "width": 1920, "height": 1080 }
  },
  "frames": [
    { "step": 1, "fileName": "frame_0001.jpg", "frameId": 1, "timestampMs": 0 },
    { "step": 2, "fileName": "frame_0003.jpg", "frameId": 3, "timestampMs": 432 },
    { "step": 3, "fileName": "frame_0007.jpg", "frameId": 7, "timestampMs": 1600 }
  ],
  "animations": []
}
```

Use `timestampMs` to describe when events happen in the video.

### analysis.json Schema

Produced by the imbas-media subagent after frame analysis:

```json
{
  "source": "/path/to/original.mp4",
  "analyzed_at": "2026-04-04T11:00:00+09:00",
  "total_frames": 12,
  "duration_ms": 19218,
  "resolution": "1920x1080",
  "scenes": [
    {
      "scene_id": 1,
      "start_ms": 0,
      "end_ms": 3200,
      "description": "Login screen — email/password input fields, 3 social login buttons",
      "frames": [
        {
          "path": "frames/frame_0001.jpg",
          "timestamp_ms": 0,
          "description": "Initial login form state"
        }
      ],
      "ui_elements": ["email_input", "password_input", "google_btn"],
      "interaction_type": "form_input"
    }
  ],
  "summary": "Login → social account selection → OAuth auth → main screen transition",
  "key_observations": [
    "~2 second delay observed during Google OAuth popup"
  ]
}
```

Each frame in analysis.json includes a `path` field so callers can verify specific scenes
by reading the actual frame image directly (e.g., "Show me the error toast in Scene 3").

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

## Error Codes and Recovery

| Code | Meaning | Recovery |
|------|---------|----------|
| `FILE_NOT_FOUND` | Input file or URL target missing | Verify file path or URL; check Atlassian permissions |
| `INVALID_FORMAT` | Unsupported format or no video stream | Check file extension; file may be corrupted or audio-only |
| `INVALID_INPUT` | Bad parameter values | Check numeric options (quality 1-100, threshold 0-1) |
| `PIPELINE_ERROR` | FFmpeg or OpenCV processing failure | Retry with `--debug` flag to preserve temp files for inspection |
| `WORKER_ERROR` | Worker thread crash during extraction | Retry once; reduce load with `--max-frames 100` or `--concurrency 1` |

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

- Same file path with existing analysis.json → return cached result (skip extraction)
- Use `--force` flag to bypass cache and re-analyze
- `.temp/` directory is gitignored
- Manual cleanup via `/imbas:setup clear-temp`
- No automatic cleanup (no deletion without user consent)
