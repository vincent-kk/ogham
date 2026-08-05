# estimate — Output Schema (estimation.json)

Validated by `EstimationManifestSchema` (`src/types/manifest.ts`) via `mcp__plugin_imbas_tools__manifest_save(type: "estimation")`. Canonical contract: `.metadata/imbas/estimation.md` §2.1.

```jsonc
{
  "version": 1,
  "run_id": "20260805-001",
  "project_ref": "PROJ",
  "source": "refined.md",
  "created_at": "<ISO timestamp>",
  "config_used": {
    "team_size": 2,
    "buffer_ratio": 0.2,
    "...": "coefficients actually applied (CLI overrides included)",
  },
  "units": [
    {
      "id": "U-1", // stable within this manifest
      "name": "이메일 로그인",
      "view_refs": {
        // which views surfaced this unit
        "page": ["로그인 화면"],
        "feature": ["이메일 로그인"],
        "module": ["인증"],
      },
      "single_view": false, // true → report confirmation list
      "complexity": "M", // S | M | L | XL
      "estimate": {
        "o": 1.5,
        "m": 3,
        "p": 6, // three-point, man-days
        "expected": 3.25, // (o + 4m + p) / 6
        "sigma": 0.75, // (p - o) / 6
      },
      "rationale": "표준 인증 플로우이나 소셜 연동 스펙 미확정으로 p 가중",
      "deps": [], // unit ids that must precede this one
    },
  ],
  "rollup": {
    "sum_expected": 42.5,
    "overhead": { "integration": 4.3, "test": 6.4, "pm": 2.1 }, // man-days
    "buffered_total": 66.4,
    "confidence_interval": [55.1, 77.7], // [lo, hi], lo <= hi
  },
  "schedule": {
    "tracks": [{ "track": 1, "units": ["U-1", "U-3"] }], // each unit in at most one track
    "milestones": [{ "name": "인증 모듈 완료", "week": 3 }],
    "total_weeks": 8,
  },
  "assumptions": ["소셜 로그인은 Google 1종만"],
  "risks": [
    { "unit": "U-7", "risk": "외부 API 스펙 미확정", "impact": "high" },
  ],
}
```

Integrity rules enforced by `manifest_validate` (errors): duplicate unit ids, `deps` referencing unknown units, schedule tracks referencing unknown units, a unit scheduled in two tracks, inverted confidence interval. Warnings: milestone beyond `total_weeks`, risk referencing an unknown unit.
