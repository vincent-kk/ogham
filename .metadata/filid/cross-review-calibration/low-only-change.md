# Calibration Fixture — Warning-Only FCA Change

Start from `clean-change.md` and apply its clean implementation and verification update. Then add one file on `calib/run-b`:

`src/slugify/notes.md`:

```markdown
# Implementation Notes

Slug generation is deterministic.
```

The file is a standalone peer in a fractal root and is not an allowed static or eponymous file. The canonical `zero-peer-file` warning must use category `structure`, be confirmed by independent verification, and produce `REQUEST_CHANGES`.

No other finding is seeded.
