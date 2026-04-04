# SPEC-state — 상태 관리 & 설정

> Status: Draft v1.1 (2026-04-04) — Provider abstraction applied
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. Plugin-MCP 상태머신 검토 결과: 불필요

### 검토 항목

| 관점 | 분석 | 결론 |
|------|------|------|
| **워크플로우 복잡도** | Phase 1→2→3 선형 흐름, 게이트 3개 | 단순 — 파일 기반으로 충분 |
| **동시성** | 단일 사용자, 단일 런 | 락 불필요 |
| **상태 크기** | phase + manifest(JSON) | 경량 — MCP 오버헤드 부적합 |
| **멱등성** | manifest의 status + issue_ref로 해결 | 파일 기반으로 완전히 해결 |
| **장애 복구** | manifest 재실행으로 해결 | MCP 불필요 |
| **배포 비용** | MCP 서버 추가 = 설치/유지 부담 | 파일 기반이 zero-cost |

### 결론

**파일 기반 상태 관리** 채택. 이유:
1. 워크플로우가 선형이므로 FSM 엔진 불필요
2. 스킬이 state.json을 읽어 진입 조건 검증 → 충분한 게이트 역할
3. manifest의 status/issue_ref 필드가 멱등성 보장
4. 추가 프로세스(MCP 서버) 없이 순수 파일 I/O로 동작

---

## 2. `.imbas/` 디렉토리 구조

```
<project-root>/
└── .imbas/
    ├── config.json                      # 글로벌 설정
    ├── .gitignore                       # auto-generated
    │
    ├── <PROJECT-DIR>/                   # 프로젝트별 디렉토리 (Jira: KEY, GitHub: owner--repo)
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
            ├── frames/
            │   ├── frame_*.jpg
            │   └── .metadata.json
            └── analysis.json
```

---

## 3. config.json 스키마

```json
{
  "version": "1.1",
  "provider": "jira",
  "language": {
    "documents": "ko",
    "skills": "en",
    "issue_content": "ko",
    "reports": "ko"
  },
  "defaults": {
    "project_ref": null,
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
      "split_from": "split from",
      "relates_to": "relates to"
    }
  },
  "github": {
    "repo": "owner/repo",
    "labels": {
      "epic": "type:epic",
      "story": "type:story",
      "task": "type:task",
      "subtask": "type:subtask",
      "bug": "type:bug",
      "todo": "status:todo",
      "ready_for_dev": "status:ready-for-dev",
      "in_progress": "status:in-progress",
      "in_review": "status:in-review",
      "done": "status:done",
      "imbas_managed": "imbas"
    },
    "epic_style": "tracking_issue_with_milestone"
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
| `provider` | **NEW** — 이슈 트래커 백엔드: `"jira"` \| `"github"` |
| `language.documents` | 기획 문서, 검증 리포트 작성 언어 |
| `language.skills` | 스킬/에이전트 파일 작성 언어 (항상 en) |
| `language.issue_content` | 이슈 title/description 언어 (renamed from `jira_content`) |
| `language.reports` | 매니페스트, 상태 리포트 언어 |
| `defaults.project_ref` | 기본 프로젝트 참조 — Jira: `"PROJ"`, GitHub: `"owner/repo"` (renamed from `project_key`) |
| `defaults.llm_model` | Phase별 사용 LLM 모델 |
| `defaults.subtask_limits` | Subtask 종료조건 수치 |
| `jira.*` | Jira 이슈 타입/상태/링크 매핑 (provider=jira 일 때 사용) |
| `github.*` | GitHub 라벨/마일스톤 매핑 (provider=github 일 때 사용). 상세: [SPEC-provider-github.md](./SPEC-provider-github.md) |
| `media.*` | 미디어 처리 설정 (provider-agnostic) |

### Provider별 필수 섹션

| provider | 필수 config 섹션 | 비고 |
|----------|-----------------|------|
| `jira` | `jira` | `github` 섹션 무시 |
| `github` | `github` | `jira` 섹션 무시 |

---

## 4. state.json 스키마

```json
{
  "run_id": "20260404-001",
  "provider": "jira",
  "project_ref": "PROJ",
  "epic_ref": null,
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
      "result": "PASS",            // "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED"
      "blocking_issues": 0,
      "warning_issues": 0
    },
    "split": {
      "status": "in_progress",          // "pending" | "in_progress" | "completed" | "escaped"
      "started_at": "2026-04-04T10:20:00+09:00",
      "completed_at": null,
      "output": "stories-manifest.json",
      "stories_created": 0,
      "pending_review": true,
      "escape_code": null               // null | "E2-1" | "E2-2" | "E2-3" | "EC-1" | "EC-2"
    },
    "devplan": {
      "status": "pending",
      "started_at": null,
      "completed_at": null,
      "output": "devplan-manifest.json",
      "pending_review": true
    }
  }
}
```

### PhaseStatus 열거형

```
"pending" | "in_progress" | "completed" | "escaped"
```

- `escaped`: split phase에서만 발생. 탈출 조건 감지 시 설정 (SPEC-skills.md §2.2 Step 4.5).

### EscapeCode 열거형

| Code | 상황 | 액션 |
|------|------|------|
| `E2-1` | 구체화 필요 — 정보 부족 | 부족 정보 목록 + 인간 보완 요청 |
| `E2-2` | 모순/충돌 발견 | 충돌 지점 명시 + 인간 의사결정 요청 |
| `E2-3` | 분할 불필요 — 이미 적정 크기 | Phase 3 직행 가능 |
| `EC-1` | 이해 불가 — 해석 불능 | 범위 동결 + 질의 구조화 |
| `EC-2` | 원본 결함 발견 | 결함 리포트 (Phase 1 재검증 권고) |

### 상태 전이 규칙

```
validate.status == "completed" && validate.result in ["PASS", "PASS_WITH_WARNINGS"]
  → split 진입 가능 (PASS_WITH_WARNINGS 시 경고 표시)

split.status == "completed" && split.pending_review == false
  → devplan 진입 가능

split.status == "escaped" && split.escape_code == "E2-3"
  → devplan 진입 가능 (분할 불필요 — 적정 크기)

split.status == "escaped" && split.escape_code in ["E2-1", "E2-2", "EC-1", "EC-2"]
  → devplan 진입 불가 — 사용자 개입 필요

devplan.status == "completed" && devplan.pending_review == false
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
  "provider": "jira",
  "project_ref": "PROJ",
  "epic_ref": "PROJ-100",
  "created_at": "2026-04-04T10:30:00+09:00",
  "stories": [
    {
      "id": "S1",
      "title": "소셜 로그인으로 신규 가입",
      "description": "## User Story\n\nAs a ...",
      "type": "story",
      "status": "pending",
      "issue_ref": null,
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
  "provider": "jira",
  "project_ref": "PROJ",
  "epic_ref": "PROJ-100",
  "created_at": "2026-04-04T11:00:00+09:00",
  "tasks": [
    {
      "id": "T1",
      "title": "OAuth provider 추상화 레이어 구현",
      "description": "...",
      "type": "task",
      "status": "pending",
      "issue_ref": null,
      "blocks": ["S1-a", "S1-b", "S2"],
      "subtasks": [
        {
          "id": "T1-ST1",
          "title": "When a new provider is registered, the system shall validate OAuth config",
          "description": "## Spec\n\nWhen ...",
          "status": "pending",
          "issue_ref": null
        }
      ]
    }
  ],
  "story_subtasks": [
    {
      "story_id": "S1-a",
      "story_ref": "PROJ-101",
      "subtasks": [
        {
          "id": "S1a-ST1",
          "title": "When OAuth callback returns, the system shall create user account",
          "description": "...",
          "status": "pending",
          "issue_ref": null
        }
      ]
    }
  ],
  "feedback_comments": [
    {
      "target_story": "S1-a",
      "target_ref": "PROJ-101",
      "comment": "Story AC의 OAuth scope과 코드의 실제 scope 불일치 — devplan에서 별도 매핑",
      "type": "mapping_divergence",
      "status": "pending"
    }
  ],
  "execution_order": [
    { "step": 1, "action": "create_tasks", "items": ["T1"] },
    { "step": 2, "action": "create_task_subtasks", "items": ["T1-ST1", "T1-ST2"] },
    { "step": 3, "action": "create_links", "items": ["T1→S1-a", "T1→S1-b"] },
    { "step": 4, "action": "create_story_subtasks", "items": ["S1a-ST1", "S1a-ST2"] },
    { "step": 5, "action": "add_feedback_comments", "items": ["S1-a"] }
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

- [SPEC-provider.md](./SPEC-provider.md) — Provider 추상화 인터페이스
- [SPEC-provider-jira.md](./SPEC-provider-jira.md) — Jira provider 구현
- [SPEC-provider-github.md](./SPEC-provider-github.md) — GitHub provider 구현
- [SPEC-skills.md](./SPEC-skills.md) — 상태를 읽고 쓰는 스킬 정의
- [SPEC-agents.md](./SPEC-agents.md) — 상태 기반으로 동작하는 에이전트
- [BLUEPRINT.md](../BLUEPRINT.md) — 전체 아키텍처
