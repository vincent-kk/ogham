# atlassian-media-analysis — Preset Auto-Selection & File Structure

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

See [presets/index.md](../presets/index.md) for the full decision matrix and all 10 preset definitions.

## File Structure

```
.temp/
└── login-demo.mp4/
    ├── frames/
    │   ├── frame_0001.jpg
    │   ├── frame_0003.jpg
    │   ├── frame_0007.jpg
    │   └── .metadata.json
    └── analysis.json
```
