# Storage — `.imbas/` 레이아웃 · config 2계층 · 스키마

## 1. 디렉토리 레이아웃

```
.imbas/                          # 프로젝트 루트 (project 계층)
├── config.json                  # project 계층 설정 (user 계층을 재정의)
├── .gitignore
├── <PROJECT-KEY>/               # jira key 그대로 · github "owner/repo" → "owner--repo"
│   ├── cache/                   # provider 메타데이터 — setup(refresh-cache)이 파일로 관리
│   │   ├── project-meta.json
│   │   ├── issue-types.json     # jira 전용
│   │   ├── link-types.json      # jira 전용
│   │   ├── workflows.json       # jira 전용
│   │   └── cached_at.json       # TTL 판정 기준
│   ├── issues/                  # local provider 전용
│   │   ├── stories/             #   S-<N>.md
│   │   ├── tasks/               #   T-<N>.md
│   │   └── subtasks/            #   ST-<N>.md (v1 생성분 호환 유지)
│   └── runs/
│       └── <YYYYMMDD-NNN>/
│           ├── state.json            # MCP 상태머신 소유
│           ├── source.md             # 원본 스냅샷 (읽기 전용)
│           ├── supplements/
│           ├── refined.md            # refine 산출 — 재구조화된 기획서
│           ├── validation-report.md
│           ├── estimation.json       # estimate 산출 (manifest_save 검증)
│           ├── estimation-report.md
│           └── stories-manifest.json # split 산출 + 생성 상태 저장소
└── .temp/                       # 임시 파일 (clear-temp 대상)
```

- v1 대비: `devplan-manifest.json`·`implement-plan.json`·`implement-plan-report.md` 소멸, `refined.md`·`estimation.*` 신규.
- 상태의 주소는 둘뿐: phase 진행 = `state.json`, 이슈 생성 진행 = `stories-manifest.json`의 항목별 `issue_ref`/`status`. 그 외 위치에 상태 저장 금지.

## 2. Config — user/project 2계층

- user 계층: `~/.claude/plugins/imbas/config.json` (모든 워크스페이스 상속) · project 계층: `<cwd>/.imbas/config.json` (재정의). 병합·경로 해석은 `@ogham/cross-platform`(config-scope)이 소유.
- 쓰기 표면(`config_set`, 설정 웹폼 `/save`)은 `scope` 필수 — 계층 기본값 없음.

```jsonc
{
  "provider": "jira",                       // "jira" | "github" | "local"
  "project": { "key": "PROJ" },             // github: { "repo": "owner/repo" } · local: { "key": "LOCAL" }
  "language": {
    "documents": "ko",                      // refined.md·리포트
    "skills": "en",                         // 스킬/에이전트 파일 (항상 en)
    "issue_content": "ko",                  // 이슈 title/description
    "reports": "ko"
  },
  "labels": ["imbas"],                      // 생성 이슈 공통 라벨
  "estimation": {                           // v2 신규 — estimation.md §3
    "team_size": 2,
    "available_manday_per_week": 5,
    "complexity_baseline": { "S": 1, "M": 3, "L": 8, "XL": 20 },
    "overhead_ratio": { "integration": 0.1, "test": 0.15, "pm": 0.05 },
    "buffer_ratio": 0.2
  }
}
```

## 3. `state.json` 스키마 (v2)

```jsonc
{
  "run_id": "20260805-001",
  "project_ref": "PROJ",
  "source_file": "source.md",
  "phases": {
    "refine":   { "status": "completed", "result": "PASS", "blocking_issues": 0, "warning_issues": 2 },
    "estimate": { "status": "completed", "estimated_manday": 66.4 },   // skip 시 { "status": "skipped" }
    "split":    { "status": "in_progress", "stories_created": 4, "pending_review": false }
  },
  "created_at": "...", "updated_at": "..."
}
```

- 전이 규칙(핸들러 강제): `refine → estimate → split` 순서, `estimate`만 skip 가능, 완료된 phase 재시작은 escape 코드 필요.

## 4. `stories-manifest.json` 스키마 (v1 유지 + estimation 연계)

```jsonc
{
  "version": 2,
  "epic": { "title": "...", "issue_ref": "PROJ-100", "status": "created" },
  "items": [
    {
      "id": "S-1",
      "type": "story",                     // story | task | bug
      "title": "...",
      "description": "...",
      "links": [{ "type": "relates to", "target": "S-2" }],
      "estimate_manday": 3.25,             // estimation.json 연계 시 병기 (없으면 null)
      "issue_ref": "PROJ-123",             // 생성 전 null — 이 필드가 재개 기준
      "status": "created"                  // pending | created | failed
    }
  ]
}
```

- `estimation.json` 스키마는 [estimation.md](./estimation.md) §2.1.

## 5. 캐시 정책

- `cached_at.json`의 타임스탬프로 TTL 판정 (기본 7일). 만료 시 스킬이 setup `refresh-cache`를 안내하거나 provider 직접 조회로 폴백.
- MCP cache 도구는 없다 — 파일이 곧 계약이며, 스키마는 provider별 references가 기술한다.
