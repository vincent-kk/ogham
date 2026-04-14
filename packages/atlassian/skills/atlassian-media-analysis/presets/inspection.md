# Preset: inspection

Visual bug detection with low threshold and animation tracking.

## When to use

- User wants to find visual bugs, flickering, or glitches
- Intent trigger: "버그 있는지 봐", "깜빡이는 부분 찾아줘", "inspection"

## Flags

| Flag | Value | Reasoning |
|------|-------|-----------|
| `-n` | 20 | High count to catch transient visual issues |
| `-t` | 0.15 | Very low threshold to capture even minor changes |
| `--fps` | 5 | Default extraction rate |
| `--max-frames` | 300 | Default cap |
| `-s` | 720 | Default analysis resolution |
| `-q` | 80 | Default quality |
| `-it` | 0.7 | Lower IoU threshold to catch more animation regions |
| `-at` | 3 | Lower animation threshold for quicker detection |

## Command

```bash
npx -y @lumy-pack/scene-sieve "<input>" --json \
  -n 20 -t 0.15 -it 0.7 -at 3 \
  -o "<output-dir>" 2>/dev/null
```
