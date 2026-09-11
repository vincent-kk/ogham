---
name: media-analysis
user-invocable: true
description: 'Download Jira/Confluence images, videos, or GIFs, extract frames with scene-sieve, and optionally analyze them with the media agent. Use for "analyze media" (any language), or when a screen recording or GIF must be understood.'
argument-hint: "<url-or-path> [--analyze] [--preset NAME] [--force]"
version: "1.2.0"
complexity: moderate
plugin: atlassian
---

# media-analysis

Resolve media to an image path or extracted frames; optionally ask the media agent for a text analysis.

## Arguments

- `<url-or-path>` - Atlassian attachment URL or local file.
- `--analyze` - analyze extracted frames.
- `--preset <name>` - override intent-based selection.
- `--force` - bypass cached analysis.

## Layout

```
.temp/<namespace>/<filename>             downloaded file
.temp/<namespace>/<filename>.analysis/   frames/ and analysis.json
```

Use the download skill's namespace; local files use `local` and retain their original path.

## Workflow

1. Atlassian URL: download per the `download` skill and keep `saved_to`; local path: use as-is.
2. Run `node "<skill-dir>/scripts/probe.mjs" "<file>" [preset]`. Pass the `--preset` value, or choose `quick-glance`, `detailed`, `hq-capture`, `inspection`, or `screen-recording` from the user's intent. Otherwise the probe picks by extension and duration. `scripts/probe.mjs` owns the preset definitions. Continue only when JSON `ok` is true; treat `preset` and `command`/`argv` as the source of truth and surface a non-null `warning`.
3. If `probe.type === "image"`, return the path for multimodal Read and stop.
4. Reuse `analysis.json` when present, `--force` is absent, and its `preset` equals the selected one; return its summary and stop.
5. Run `argv` (or `command`) with `-o "<analysis-dir>/frames"`. Keep `--json` and parse `ok` before continuing.
6. Without `--analyze`, return the frames directory and count. Otherwise spawn `media` with the absolute frames directory, `.metadata.json`, original path, preset name, `analysis.json` target, and user's purpose; relay only its text summary.

## Failure rules

- Inspect the structured error before retrying.
- Rejected flag: run `npx -y @lumy-pack/scene-sieve --describe` and adapt to the reported interface.
- Timeout or memory pressure: retry once with `--max-frames 100 --concurrency 1` and lower scale.
- No video stream: report it.

## Boundaries

- Never modify the source media.
- Nothing under `.temp/` is deleted without the user's consent.
- `npx -y` follows the host approval policy.
