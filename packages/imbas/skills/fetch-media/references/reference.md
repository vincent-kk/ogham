# imbas-fetch-media — Reference

## Complete CLI Flag Reference

All 14 scene-sieve flags available for preset customization:

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

### Flag tuning guide

**`-n` vs `-t`** — Two different pruning strategies:
- `count` only: greedy merge algorithm (min-heap, O(N log N))
- `threshold` only: max-normalized score filter (O(N))
- Both: threshold filter first, then greedy merge on remaining frames

**`--fps`** — Higher values capture fast-paced content but increase processing time. For screen recordings with sparse changes, `--fps 2` is sufficient. For action video, try `--fps 10`.

**`--max-frames`** — Safety cap. For videos longer than `max-frames / fps` seconds, FPS is auto-reduced. Lower this for memory-constrained environments.

**`-s, --scale`** — Vision analysis resolution. Lowering to 480 halves processing time but may miss small UI changes.

**`-it, --iou-threshold`** — Controls how aggressively repeating animation regions are tracked. Lower values (0.7) catch more animations but risk false positives.

**`-at, --anim-threshold`** — Minimum frames a region must repeat to be classified as animation. Raise for content with legitimate repeating elements.

## JSON Output Format

### scene-sieve success response

```json
{
  "ok": true,
  "command": "extract",
  "data": {
    "success": true,
    "originalFrames": 90,
    "selectedFrames": 5,
    "outputFiles": [
      "/path/to/output/frame_0001.jpg",
      "/path/to/output/frame_0003.jpg",
      "/path/to/output/.metadata.json"
    ],
    "animations": [],
    "video": {
      "originalDurationMs": 19218,
      "fps": 5,
      "resolution": { "width": 720, "height": 405 }
    }
  },
  "meta": { "version": "0.0.13", "durationMs": 24054, "timestamp": "..." }
}
```

### scene-sieve error response

```json
{
  "ok": false,
  "command": "extract",
  "error": { "code": "FILE_NOT_FOUND", "message": "File not found: /bad/path.mp4" },
  "meta": { ... }
}
```

### .metadata.json schema

Written alongside output frames in the frames/ directory:

```json
{
  "video": { "originalDurationMs": 19218, "fps": 5, "resolution": { "width": 720, "height": 405 } },
  "frames": [
    { "step": 1, "fileName": "frame_0001.jpg", "frameId": 1, "timestampMs": 0 },
    { "step": 2, "fileName": "frame_0003.jpg", "frameId": 3, "timestampMs": 432 }
  ],
  "animations": []
}
```

Use `timestampMs` to describe when events happen in the video.

### analysis.json schema

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
  "summary": "Login -> social account selection -> OAuth auth -> main screen transition",
  "key_observations": [
    "~2 second delay observed during Google OAuth popup"
  ]
}
```

Each frame in analysis.json includes a `path` field so callers can verify specific scenes
by reading the actual frame image directly (e.g., "Show me the error toast in Scene 3").

## Frame Output Naming

Output frames follow the pattern `frame_NNNN.jpg` (zero-padded 4 digits).
Gaps in numbering are normal — they indicate pruned frames.
Example: `frame_0001.jpg`, `frame_0003.jpg`, `frame_0007.jpg` means frames 2, 4-6 were pruned.

## Error Codes

| Code | Meaning | Recovery |
|------|---------|----------|
| `FILE_NOT_FOUND` | Input file or URL target missing | Verify file path or URL; check Atlassian permissions |
| `INVALID_FORMAT` | Unsupported format or no video stream | Check file extension; file may be corrupted or audio-only |
| `INVALID_INPUT` | Bad parameter values | Check numeric options (quality 1-100, threshold 0-1) |
| `PIPELINE_ERROR` | FFmpeg or OpenCV processing failure | Retry with `--debug` flag to preserve temp files for inspection |
| `WORKER_ERROR` | Worker thread crash during extraction | Retry once; reduce load with `--max-frames 100` or `--concurrency 1` |

## Troubleshooting

### scene-sieve not found

```bash
npx -y @lumy-pack/scene-sieve --version
```

If this fails, install globally: `npm install -g @lumy-pack/scene-sieve`

### Processing takes too long (>60s)

For long videos (>5 min), reduce workload:

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json -n 10 --fps 2 --max-frames 100 -s 480 -o "<output>" 2>/dev/null
```

### Out of memory

Lower concurrency and scale:

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json -n 10 --concurrency 1 -s 480 -o "<output>" 2>/dev/null
```
