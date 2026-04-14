# Preset: hq-capture

High-quality screenshots at full resolution.

## When to use

- User wants crisp, high-resolution frame captures
- Intent trigger: "스크린샷 뽑아줘", "선명하게 추출", "high quality"

## Flags

| Flag | Value | Reasoning |
|------|-------|-----------|
| `-n` | 8 | Moderate count; focus is on quality not quantity |
| `-t` | 0.5 | Default threshold |
| `--fps` | 5 | Default extraction rate |
| `--max-frames` | 300 | Default cap |
| `-s` | 1080 | Full HD resolution for crisp output |
| `-q` | 95 | Near-lossless JPEG quality |

## Command

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json \
  -n 8 -s 1080 -q 95 \
  -o "<output-dir>" 2>/dev/null
```
