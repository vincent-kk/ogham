# SPEC-state — 상태 관리 & 설정

> Status: Draft v1.0 (2026-04-04)
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. Plugin-MCP 상태머신 검토 결과: 불필요

### 검토 항목

| 관점 | 분석 | 결론 |
|------|------|------|
| **워크플로우 복잡도** | Phase 1→2→3 선형 흐름, 게이트 3개 | 단순 — 파일 기반으로 충분 |
| **동시성** | 단일 사용자, 단일 런 | 락 불필요 |
| **상태 크기** | phase + manifest(JSON) | 경량 — MCP 오버헤드 부적합 |
| **멱등성** | manifest의 status + jira_key로 해결 | 파일 기반으로 완전히 해결 |
| **장애 복구** | manifest 재실행으로 해결 | MCP 불필요 |
| **배포 비용** | MCP 서버 추가 = 설치/유지 부담 | 파일 기반이 zero-cost |

### 결론

**파일 기반 상태 관리** 채택. 이유:
1. 워크플로우가 선형이므로 FSM 엔진 불필요
2. 스킬이 state.json을 읽어 진입 조건 검증 → 충분한 게이트 역할
3. manifest의 status/jira_key 필드가 멱등성 보장
4. 추가 프로세스(MCP 서버) 없이 순수 파일 I/O로 동작

---

## 2. `.imbas/` 디렉토리 구조

```
<project-root>/
└── .imbas/
    ├── config.json                      # 글로벌 설정
    ├── .gitignore                       # auto-generated
    │
    ├── <PROJECT-KEY>/                   # Jira 프로젝트별 디렉토리
    │   ├── cache/                       # Jira 메타데이터 캐시
    │   │   ├── project-meta.json        # 프로젝트명, 키, URL
    │   │   ├── issue-types.json         # 이슈 타입 + 필수 필드
    │   │   ├── link-types.json          # 이슈 링크 타입 목록
    │   │   ├── workflows.json           # 워크플로우 상태/전환
    │   │   └── cached_at.json           # 캐시 타임스탬프
    │   │
    │   └── runs/                        # 실행 기록
    │       └── <run-id>/                # YYYYMMDD-NNN 형식
    │           ├── state.json           # 런 상태 (현재 phase, 타임스탬프)
    │           ├── source.md            # 원본 문서 사본 (불변)
    │           ├── supplements/         # 보조 자료 (선택)
    │           │   └── *.md
    │           ├── validation-report.md # Phase 1 출력
    │           ├── stories-manifest.json# Phase 2 출력
    │           └── devplan-manifest.json# Phase 3 출력
    │
    └── .temp/                           # 미디어 임시 파일 (gitignored)
        └── <filename>/
            ├── frame_0001.jpg
            ├── .metadata.json
            └── analysis.json
```

---

## 3. config.json 스키마

```json
{
  "version": "1.0",
  "language": {
    "documents": "ko",
    "skills": "en",
    "jira_content": "ko",
    "reports": "ko"
  },
  "defaults": {
    "project_key": null,
    "llm_model": {
      "validate": "sonnet",
      "split": "sonnet",
      "devplan": "opus"
    },
    "subtask_limits": {
      "max_lines": 200,
      "max_files": 10,
      "review_hours": 1
    }
  },
  "jira": {
    "issue_types": {
      "epic": "Epic",
      "story": "Story",
      "task": "Task",
      "subtask": "Sub-task",
      "bug": "Bug"
    },
    "workflow_states": {
      "todo": "To Do",
      "ready_for_dev": "Ready for Dev",
      "in_progress": "In Progress",
      "in_review": "In Review",
      "done": "Done"
    },
    "link_types": {
      "blocks": "Blocks",
      "split_into": "is split into",
      "split_from": "split from"
    }
  },
  "media": {
    "scene_sieve_command": "npx -y @lumy-pack/scene-sieve",
    "temp_dir": ".temp",
    "max_frames": 20,
    "default_preset": "medium-video"
  }
}
```

### 필드 설명

| 필드 | 설명 |
|------|------|
| `language.documents` | 기획 문서, 검증 리포트 작성 언어 |
| `language.skills` | 스킬/에이전트 파일 작성 언어 (항상 en) |
| `language.jira_content` | Jira 이슈 title/description 언어 |
| `language.reports` | 매니페스트, 상태 리포트 언어 |
| `defaults.project_key` | 기본 Jira 프로젝트 키 (setup에서 설정) |
| `defaults.llm_model` | Phase별 사용 LLM 모델 |
| `defaults.subtask_limits` | Subtask 종료조건 수치 |
| `jira.*` | Jira 이슈 타입/상태/링크 매핑 (프로젝트별 커스터마이징 가능) |
| `media.*` | 미디어 처리 설정 |

---

## 4. state.json 스키마

```json
{
  "run_id": "20260404-001",
  "project_key": "PROJ",
  "epic_key": null,
  "source_file": "source.md",
  "created_at": "2026-04-04T10:00:00+09:00",
  "updated_at": "2026-04-04T11:30:00+09:00",
  "current_phase": "split",
  "phases": {
    "validate": {
      "status": "completed",
      "started_at": "2026-04-04T10:00:00+09:00",
      "completed_at": "2026-04-04T10:15:00+09:00",
      "output": "validation-report.md",
      "result": "PASS",
      "blocking_issues": 0
    },
    "split": {
      "status": "in_progress",
      "started_at": "2026-04-04T10:20:00+09:00",
      "completed_at": null,
      "output": "stories-manifest.json",
      "stories_created": 0,
      "pending_review": true
    },
    "devplan": {
      "status": "pending",
      "started_at": null,
      "completed_at": null,
      "output": "devplan-manifest.json"
    }
  }
}
```

### 상태 전이 규칙

```
validate.status == "completed" && validate.result == "PASS"
  → split 진입 가능

split.status == "completed" && split.pending_review == false
  → devplan 진입 가능

devplan.status == "completed"
  → 매니페스트 실행 가능 (imbas:manifest)
```

---

## 5. 프로젝트 캐시 스키마

### project-meta.json

```json
{
  "key": "PROJ",
  "name": "My Project",
  "url": "https://myorg.atlassian.net/browse/PROJ",
  "lead": "user@example.com",
  "project_type": "software"
}
```

### issue-types.json

```json
{
  "types": [
    {
      "id": "10001",
      "name": "Epic",
      "subtask": false,
      "fields": {
        "summary": { "required": true },
        "description": { "required": false },
        "customfield_10011": { "name": "Epic Name", "required": true }
      }
    },
    {
      "id": "10002",
      "name": "Story",
      "subtask": false,
      "fields": { "...": "..." }
    }
  ]
}
```

### link-types.json

```json
{
  "types": [
    { "id": "10000", "name": "Blocks", "inward": "is blocked by", "outward": "blocks" },
    { "id": "10001", "name": "Cloners", "inward": "is cloned by", "outward": "clones" }
  ]
}
```

### cached_at.json

```json
{
  "cached_at": "2026-04-04T10:00:00+09:00",
  "ttl_hours": 24
}
```

---

## 6. Manifest 스키마

### stories-manifest.json (Phase 2 출력)

```json
{
  "batch": "imbas-20260404-001",
  "run_id": "20260404-001",
  "project_key": "PROJ",
  "epic_key": "PROJ-100",
  "created_at": "2026-04-04T10:30:00+09:00",
  "stories": [
    {
      "id": "S1",
      "title": "소셜 로그인으로 신규 가입",
      "description": "## User Story\n\nAs a ...",
      "type": "Story",
      "status": "pending",
      "jira_key": null,
      "verification": {
        "anchor_link": true,
        "coherence": "PASS",
        "reverse_inference": "PASS"
      },
      "size_check": "PASS",
      "split_from": null,
      "split_into": []
    }
  ],
  "links": [
    {
      "type": "is split into",
      "from": "S1",
      "to": ["S1-a", "S1-b"],
      "status": "pending"
    }
  ]
}
```

### devplan-manifest.json (Phase 3 출력)

```json
{
  "batch": "imbas-20260404-001",
  "run_id": "20260404-001",
  "project_key": "PROJ",
  "epic_key": "PROJ-100",
  "created_at": "2026-04-04T11:00:00+09:00",
  "tasks": [
    {
      "id": "T1",
      "title": "OAuth provider 추상화 레이어 구현",
      "description": "...",
      "type": "Task",
      "status": "pending",
      "jira_key": null,
      "blocks": ["S1-a", "S1-b", "S2"],
      "subtasks": [
        {
          "id": "T1-ST1",
          "title": "When a new provider is registered, the system shall validate OAuth config",
          "description": "## Spec\n\nWhen ...",
          "status": "pending",
          "jira_key": null
        }
      ]
    }
  ],
  "story_subtasks": [
    {
      "story_id": "S1-a",
      "story_key": "PROJ-101",
      "subtasks": [
        {
          "id": "S1a-ST1",
          "title": "When OAuth callback returns, the system shall create user account",
          "description": "...",
          "status": "pending",
          "jira_key": null
        }
      ]
    }
  ],
  "execution_order": [
    { "step": 1, "action": "create_tasks", "items": ["T1"] },
    { "step": 2, "action": "create_task_subtasks", "items": ["T1-ST1", "T1-ST2"] },
    { "step": 3, "action": "create_links", "items": ["T1→S1-a", "T1→S1-b"] },
    { "step": 4, "action": "create_story_subtasks", "items": ["S1a-ST1", "S1a-ST2"] }
  ]
}
```

---

## 7. .gitignore 자동 관리

`imbas:setup` 실행 시 `.imbas/` 최상위에 .gitignore 생성:

```gitignore
# imbas auto-generated — do not edit
*
```

또한 프로젝트 루트 `.gitignore`에 `.imbas/` 추가 (setup-lens 패턴과 동일):
1. `.git` 존재 확인
2. `git check-ignore -q .imbas` 확인
3. 미등록이면 `.gitignore`에 `.imbas/` 추가

---

## Related

- [SPEC-skills.md](./SPEC-skills.md) — 상태를 읽고 쓰는 스킬 정의
- [SPEC-agents.md](./SPEC-agents.md) — 상태 기반으로 동작하는 에이전트
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
