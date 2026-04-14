# Preset: quick-glance

Fast summary with minimal frames. Low resolution for speed.

## When to use

- User wants a quick overview, not detailed analysis
- Intent trigger: "대충 봐줘", "summary", "quick glance"

## Flags

| Flag | Value | Reasoning |
|------|-------|-----------|
| `-n` | 5 | Minimal frames for fast overview |
| `-t` | 0.5 | Default threshold |
| `--fps` | 2 | Reduced for speed |
| `--max-frames` | 300 | Default cap |
| `-s` | 480 | Reduced resolution for speed |
| `-q` | 80 | Default quality |

## Command

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json \
  -n 5 --fps 2 -s 480 \
  -o "<output-dir>" 2>/dev/null
```
