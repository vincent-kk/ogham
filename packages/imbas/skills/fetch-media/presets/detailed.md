# Preset: detailed

Thorough analysis with many frames and low threshold.

## When to use

- User wants frame-by-frame analysis
- Intent trigger: "자세히 분석해줘", "detailed", "thorough"

## Flags

| Flag | Value | Reasoning |
|------|-------|-----------|
| `-n` | 30 | High frame count for comprehensive coverage |
| `-t` | 0.2 | Low threshold to keep more subtle changes |
| `--fps` | 10 | High extraction rate for detailed content |
| `--max-frames` | 300 | Default cap |
| `-s` | 720 | Default analysis resolution |
| `-q` | 80 | Default quality |

## Command

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json \
  -n 30 -t 0.2 --fps 10 \
  -o "<output-dir>" 2>/dev/null
```
