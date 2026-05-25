# media-analysis — Complete Workflow

```
Step 1 — Resolve input
  - URL pattern detection:
    - Confluence attachment URL -> Atlassian download
    - Jira attachment URL -> Atlassian download
    - Local file path -> use directly
  - Validate file exists (URL or path)

Step 2 — Download (if Atlassian URL)
  - See [download-flow.md](../../download/references/download-flow.md) for full download protocol
  - Derive namespace from source context:
    - Jira issue KAN-27: namespace = "KAN-27"
    - Jira issue KAN-27 + comment 10110: namespace = "KAN-27_comment-10110"
    - Confluence page 12345: namespace = "confluence-12345"
  - Use atlassian MCP `mcp_tools_fetch` tool: method=GET, accept_format="raw",
    save_to_path=".temp/<namespace>/<filename>"
  - fetch tool auto-skips download if file already exists (returns cached: true)
  - If download fails -> error with auth check guidance

Step 3 — Probe and select preset
  - Run: node "<skill-dir>/scripts/probe.mjs" "<file>" [intent]
  - Parse JSON output for: type, duration, resolution, preset, command,
    argv, stderrNull, warning
    - `command`: shell string with platform-aware quoting (POSIX `'...'` /
      Windows cmd `"..."`)
    - `argv`: argument vector for spawn/execFile — shell-independent
    - `stderrNull`: platform stderr-null redirect (`2>/dev/null` /
      Windows cmd `2>nul`)
  - If `warning` is non-null (e.g. ffprobe missing), surface it to the user before proceeding
  - If probe returns type=image -> Step 4 (image path)
  - If probe returns type=video -> Step 5 (video path)
  - See presets/index.md for the full decision matrix

Step 4 — Image handling (no scene-sieve)
  - If Atlassian URL: file already at .temp/<namespace>/<filename>
  - If local file: copy to .temp/<namespace>/<filename>
  - Return file path to caller
  - Caller reads the image directly via Read tool (multimodal)
  - No subagent needed. Skill completes here.

Step 5 — Video/GIF handling
  a. Resolve temp directory:
     - Default temp dir: ".temp"
     - Target dir: .temp/<namespace>/<filename>/
     - (namespace from Step 2; if local file, use filename as namespace)

  b. Check cache:
     - If .temp/<namespace>/<filename>/analysis.json exists AND no --force flag
       -> Return cached analysis summary
       -> Skip extraction and analysis

  c. Extract keyframes — two execution paths, pick by environment:

     Preferred (any shell): use the `argv` array from probe output,
       append ["-o", "<temp_dir>/<filename>/frames"], then spawn via
       execFile/spawn. This sidesteps shell quoting on every platform.

     Paste-and-run shell command: use the `command` field (already
       platform-quoted by probe.mjs), append the output flag with
       platform-appropriate quoting, and the `stderrNull` suffix.
         - POSIX (bash/zsh/sh — macOS, Linux, WSL, Git Bash):
             <command> -o '<temp_dir>/<filename>/frames' 2>/dev/null
         - Windows cmd.exe:
             <command> -o "<temp_dir>/<filename>/frames" 2>nul
         - Windows PowerShell:
             <command> -o "<temp_dir>/<filename>/frames" 2>$null

     Parse output: check ok field, collect outputFiles list
     Results: frame_*.jpg files + .metadata.json in frames/ directory

  d. Spawn `media` agent for analysis (if --analyze flag):
     - Pass to agent:
       - frames directory absolute path
       - .metadata.json absolute path
       - analysis.json save path: .temp/<namespace>/<filename>/analysis.json
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
