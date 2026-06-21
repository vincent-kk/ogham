# Craft Skill Examples

Three concise, self-consistent walkthroughs matching the SKILL.md workflow. Mode detection, complexity scoring, and structure layout are done inline by the model; `node scripts/enhanced_validator.mjs <skill-path>` is the deterministic gate at the end.

---

## Example 1: Simple CREATE — image-rotator

**Mode:** CREATE · **Complexity:** Simple (~0.28)

**Request:**

> "Create a skill that rotates and flips images. Support PNG and JPG."

### Phase 0-1: Mode + Requirements (inline)

CREATE is selected: no existing skill, request says "create". Concrete examples gathered:

1. Rotate an image 90°, 180°, or 270°.
2. Flip horizontally or vertically.
3. Accept PNG and JPG, write the result next to the source.

One reusable resource emerges: a small Node script that drives an image library.

### Phase 2-3: Complexity + Structure (inline)

Three files, no MCP, two workflow steps, two conditionals, one external dep → score lands well under 0.4, so **Simple**: just `SKILL.md` plus one script. No `reference.md` / `examples.md` needed.

```
image-rotator/
├── SKILL.md
└── scripts/
    └── transform.mjs
```

### Phase 4: Implementation

`SKILL.md` (excerpt):

```markdown
---
name: image-rotator
description: Rotate and flip PNG/JPG images. Use when a user asks to rotate (90/180/270) or flip (horizontal/vertical) an image without a full editor.
argument-hint: '<image> <rotate|flip> <value>'
---

# Image Rotator

## When to Use This Skill

- "rotate this image 90 degrees"
- "flip image horizontally"

## Core Workflow

1. Parse the operation and value from the request.
2. Run `node scripts/transform.mjs <image> <op> <value>`.
3. Report the written output path.
```

`scripts/transform.mjs` (excerpt):

```javascript
#!/usr/bin/env node
import path from 'node:path';

import sharp from 'sharp';

async function main() {
  const [image, op, value] = process.argv.slice(2);
  if (!image || !op || !value) {
    console.error('Usage: transform.mjs <image> <rotate|flip> <value>');
    process.exit(1);
  }
  const { name, ext, dir } = path.parse(image);
  const out = path.join(dir, `${name}_${op}_${value}${ext}`);
  const pipe = sharp(image);
  if (op === 'rotate') pipe.rotate(Number(value));
  else (pipe.flip(value === 'vertical'), pipe.flop(value === 'horizontal'));
  await pipe.toFile(out);
  console.log(`Saved to: ${out}`);
}

main();
```

### Phase 5-6: Validate + Finalize

```
node scripts/enhanced_validator.mjs ./image-rotator
✅ YAML frontmatter valid · name hyphen-case · description detailed
✅ SKILL.md within size limit · scripts/ present · shebang present
VALIDATION PASSED
```

Deploy by copying `image-rotator/` into the skills directory.

---

## Example 2: Medium REFACTOR — slimming an oversized SKILL.md

**Mode:** REFACTOR · **Complexity:** Medium (structural)

**Current state:** `api-helper/SKILL.md` is ~12k words; everything lives in one file, so it loads slowly and is hard to maintain.

**Request:**

> "Refactor this skill — SKILL.md is huge and slow to load."

### Phase 1: Current Structure Analysis (inline)

Issues identified:

- SKILL.md is ~12k words (target <5k).
- No layer separation: detailed OAuth flows and eight inline examples sit in the body.
- Scripts (`oauth.mjs`, `client.mjs`, `rate-limit.mjs`) are already fine.

### Phase 2: Refactoring Plan (diff preview, approval gate)

```diff
Files to CREATE:
+ reference.md   (detailed OAuth flows, client patterns, rate limiting)
+ examples.md    (the 8 inline examples + 2 new end-to-end ones)

Files to MODIFY:
M SKILL.md       (~12k -> ~4.2k words: keep overview + resource index)

scripts/         (unchanged)
```

User approves.

### Phase 3-4: Transform + Validate

Move the detailed sections into `reference.md`, move worked examples into `examples.md`, and compress `SKILL.md` to a high-level workflow plus a Resources index that links both files. Then:

```
node scripts/enhanced_validator.mjs ./api-helper
✅ SKILL.md within size limit
✅ reference.md and examples.md exist as referenced
✅ all cross-references resolve
VALIDATION PASSED
```

### Phase 5-6: Impact + Finalize

```
SKILL.md: ~12k -> ~4.2k words (initial-load context cut ~65%)
Progressive disclosure: enabled (reference.md, examples.md load on demand)
Behavior: unchanged — scripts and triggers identical
```

Structure after refactor:

```
api-helper/
├── SKILL.md       # overview + resource index
├── reference.md   # detailed OAuth, client, rate-limit
├── examples.md    # worked integration examples
└── scripts/
    ├── oauth.mjs
    ├── client.mjs
    └── rate-limit.mjs
```

---

## Example 3: FIX — validator rejects valid names with digits

**Mode:** FIX · **Complexity:** Unchanged

**Bug report:**

> "`enhanced_validator.mjs` rejects valid names like `api-v2-client` and `oauth2-helper` — digits should be allowed."

### Phase 1: Diagnosis (inline)

The name check uses `^[a-z-]+$`, which excludes digits. Root cause is the regex, not the caller. Single-file, single-line surface.

### Phase 2-3: Minimal Fix

```diff
- if (!/^[a-z-]+$/.test(name)) {
+ if (!/^[a-z0-9-]+$/.test(name)) {
    result.addError(`Name '${name}' must be hyphen-case (lowercase, digits, hyphens)`);
  }
```

### Phase 4: Regression Testing

```
api-client    → PASS (unchanged)
oauth2-helper → PASS (was failing, now fixed)
api-v2-client → PASS (was failing, now fixed)
API-Client    → FAIL (uppercase, expected)
api_client    → FAIL (underscore, expected)
-api-client   → FAIL (leading hyphen, expected)
```

### Phase 5-6: Finalize

Update the affected docs to list digits as valid, then confirm the fix touched exactly one line in one file with no behavioral side effects. Re-run `node scripts/enhanced_validator.mjs` on a sample skill to confirm a green pass.

---

For detailed phase-by-phase workflows, see [reference.md](reference.md).
