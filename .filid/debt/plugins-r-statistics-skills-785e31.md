---
id: plugins-r-statistics-skills-785e31
fractal_path: plugins/r-statistics/skills
file_path: plugins/r-statistics/skills
created_at: "2026-06-26T00:00:00Z"
review_branch: feature/r-statistics
original_fix_id: FIX-004
severity: MEDIUM
weight: 1
touch_count: 0
last_review_commit: null
rule_violated: fractal-missing-intentmd
metric_value: 4 skill dirs (skills, skills/analyze, skills/setup, skills/analyze/references/methods) flagged fractal without INTENT.md
---

# 기술 부채: skills dirs fractal-missing-intentmd — intentional residue (no safe config fix)

## 원래 수정 요청

Reclassify the skill directories as organ via .filid/config.json (do not add per-skill INTENT.md) so the scanner stops flagging fractal-missing-intentmd / module-entry-point warnings.

## 개발자 소명

No safe automated fix exists: FilidConfigSchema is .strict() and exposes no key to extend organ classification (only additional-allowed / additional-entry-points / additional-route-patterns / scan.maxDepth). Project convention forbids per-skill INTENT.md (skills self-describe via SKILL.md). These warnings are intentional residue, consistent with the \_shared organ precedent (project memory project_filid_shared_organ_warnings).

## 정제된 ADR

Context: knowledge-manager flagged 4 skill dirs as fractal-missing-intentmd (HIGH), chairperson mediated to MEDIUM; structure_validate reports them as warnings, not errors. Decision: leave as intentional residual warnings — do NOT add INTENT.md (violates skill-self-describing convention) and do NOT invent config keys (schema is strict). Consequence: the scanner continues to emit these specific warnings on skill dirs; accepted as known false-positives. Revisit only if filid adds a first-class organ-override config mechanism.
