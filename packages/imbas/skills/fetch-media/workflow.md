# fetch-media — Complete Workflow

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
