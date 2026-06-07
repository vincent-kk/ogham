# Preset: screen-recording

UI walkthroughs and screen recordings with sparse changes.

## When to use

- Screen recordings, UI demos, step-by-step walkthroughs
- Intent trigger: "화면 녹화", "walkthrough", "screen recording"

## Flags

| Flag | Value | Reasoning |
|------|-------|-----------|
| `-n` | 12 | Good step coverage for UI flows |
| `-t` | 0.3 | Lower threshold to catch subtle UI state changes |
| `--fps` | 2 | Low FPS; screen recordings have sparse changes |
| `--max-frames` | 300 | Default cap |
| `-s` | 720 | Default analysis resolution |
| `-q` | 80 | Default quality |

## Command

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json \
  -n 12 -t 0.3 --fps 2 \
  -o "<output-dir>" 2>/dev/null
```
