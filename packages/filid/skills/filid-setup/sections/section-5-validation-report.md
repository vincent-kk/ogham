# filid-setup — Validation and Report Format (Phase 5)

> Detail reference for Phase 5 of /filid:filid-setup.
> See [../SKILL.md](../SKILL.md) for the skill overview and phase chaining.

After all files are written, validate the resulting structure:

- Each fractal node's INTENT.md passes `validateIntentMd()` (≤ 50 lines,
  3-tier boundary sections present)
- No organ directory contains a INTENT.md
- All DETAIL.md files pass `validateDetailMd()`

Print a summary report:

```
FCA-AI Init Report
==================
Directories scanned : <n>
Fractal nodes       : <n>
Organ nodes         : <n>
Pure-function nodes : <n>
INTENT.md created   : <n>
DETAIL.md created     : <n>
Warnings            : <list or "none">
```
