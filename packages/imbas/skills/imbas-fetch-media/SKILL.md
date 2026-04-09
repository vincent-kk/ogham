---
name: imbas-fetch-media
user_invocable: true
description: "[imbas:imbas-fetch-media] Download images, videos, and GIFs from Confluence/Jira. For video/GIF files, extracts keyframes using scene-sieve and runs semantic analysis via imbas-media agent. Trigger: \"download media\", \"미디어 다운로드\", \"fetch attachment\", \"영상 분석\""
argument-hint: "<url-or-path> [--analyze] [--preset NAME] [--force]"
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
/imbas:imbas-fetch-media <url-or-path> [--analyze] [--preset <name>] [--force]

<url-or-path>  : Confluence attachment URL, Jira attachment URL, or local file path
--analyze      : For video/GIF, run scene-sieve extraction + imbas-media analysis
--preset       : scene-sieve preset override (default: auto-detect from extension/duration)
--force        : Force re-analysis even if cached analysis.json exists
```

## References

- [workflow.md](./references/workflow.md) — Complete Workflow (Steps 1-5): input resolution, download, probe, image handling, video/GIF handling
- [preset-selection.md](./references/preset-selection.md) — Preset Auto-Selection: priority rules, intent override keywords, file structure
- [tools.md](./references/tools.md) — Tools Used, Agent Spawn & Caching: imbas/Jira operations ([OP:]), imbas-media agent details, cache behavior
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
- [reference.md](./references/reference.md) — Complete flag reference (14 flags), JSON output schemas, error codes, troubleshooting
