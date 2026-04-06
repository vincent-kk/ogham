# SPEC-state �?? �?��?? �?리 & �?��?

> Status: Draft v1.1 (2026-04-04) �?? Provider abstraction applied
> Parent: [BLUEPRINT.md](../BLUEPRINT.md)

---

## 1. Plugin-MCP �?��??머�?� �?�?� 결과: �?�??�??

### �?�?� �?�목

| �?점 | �?�?� | 결론 |
|------|------|------|
| **�??크�??�?�?� 복�?��?** | Phase 1�??2�??3 �?��?? 흐�?, �?이�?� 3�? | �?��?? �?? �??일 기�?�?��? 충�? |
| **�?�??�?�** | �?�일 �?��?��?�, �?�일 �?� | 락 �?�??�?? |
| **�?��?? 크기** | phase + manifest(JSON) | 경�?? �?? MCP �?��?�?��?? �?적�?� |
| **멱�?��?�** | manifest�? status + issue_ref�? �?�결 | �??일 기�?�?��? �??�?�?? �?�결 |
| **�?��?� 복구** | manifest �?��?��??�?��? �?�결 | MCP �?�??�?? |
| **배포 �?�?�** | MCP �??�? �?�? = �?��?/�?��? �?�?� | �??일 기�?이 zero-cost |

### 결론

**�??일 기�? �?��?? �?리** �?�?�. 이�?�:
1. �??크�??�?�?��? �?��??이�?�? FSM �??�? �?�??�??
2. �?��?�이 state.json�? 읽�?� �?�?? 조건 �?증 �?? 충�?�?? �?이�?� �?��?�
3. manifest�? status/issue_ref �??�??�? 멱�?��?� 보�?�
4. �?�? �??�?�?��?�(MCP �??�?) �??이 �??�?? �??일 I/O�? �?�??

---

## 2. `.imbas/` �??�?�?�리 구조

```
<project-root>/
�??�??�?? .imbas/
    �??�??�?? config.json                      # �?�?�? �?��?
    �??�??�?? .gitignore                       # auto-generated
    �??
    �??�??�?? <PROJECT-DIR>/                   # �??�?젝�?��? �??�?�?�리 (Jira: KEY, GitHub: owner--repo)
    �??   �??�??�?? cache/                       # Jira �?�??데이�?� 캐�??
    �??   �??   �??�??�?? project-meta.json        # �??�?젝�?��?, �?�, URL
    �??   �??   �??�??�?? issue-types.json         # 이�?? �??�?? + �??�?? �??�??
    �??   �??   �??�??�?? link-types.json          # 이�?? 링크 �??�?? 목록
    �??   �??   �??�??�?? workflows.json           # �??크�??�?�?� �?��??/�?�??
    �??   �??   �??�??�?? cached_at.json           # 캐�?? �??�??�?��?��??
    �??   �??
    �??   �??�??�?? runs/                        # �?��?? 기록
    �??       �??�??�?? <run-id>/                # YYYYMMDD-NNN �??�?�
    �??           �??�??�?? state.json           # �?� �?��?? (�??�?� phase, �??�??�?��?��??)
    �??           �??�??�?? source.md            # �?�본 문�?? �?�본 (�?�?)
    �??           �??�??�?? supplements/         # 보조 �?��? (�?��?�)
    �??           �??   �??�??�?? *.md
    �??           �??�??�?? validation-report.md # Phase 1 �?력
    �??           �??�??�?? stories-manifest.json# Phase 2 �?력
    �??           �??�??�?? devplan-manifest.json# Phase 3 �?력
    �??
    �??�??�?? .temp/                           # 미�??�?� �??�?? �??일 (gitignored)
        �??�??�?? <filename>/
            �??�??�?? frames/
            �??   �??�??�?? frame_*.jpg
            �??   �??�??�?? .metadata.json
            �??�??�?? analysis.json
```

---

## 3. config.json �?��?��?

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
    "defaultLabels": ["imbas"],
    "linkTypes": ["blocks", "blocked-by", "split-from", "split-into", "relates"]
  },
  "media": {
    "scene_sieve_command": "npx -y @lumy-pack/scene-sieve",
    "temp_dir": ".temp",
    "max_frames": 20,
    "default_preset": "medium-video"
  }
}
```

### �??�?? �?��?

| �??�?? | �?��? |
|------|------|
| `provider` | **NEW** �?? 이�?? �?��??커 백�??�??: `"jira"` \| `"github"` |
| `language.documents` | 기�?� 문�??, �?증 리포�?� �??�?� �?��?� |
| `language.skills` | �?��?�/�?�이�?�?� �??일 �??�?� �?��?� (�?��?� en) |
| `language.issue_content` | 이�?? title/description �?��?� (renamed from `jira_content`) |
| `language.reports` | 매�??�??�?��?�, �?��?? 리포�?� �?��?� |
| `defaults.project_ref` | 기본 �??�?젝�?� 참조 �?? Jira: `"PROJ"`, GitHub: `"owner/repo"` (renamed from `project_key`) |
| `defaults.llm_model` | Phase�? �?��?� LLM 모델 |
| `defaults.subtask_limits` | Subtask �?�?조건 �??�? |
| `jira.*` | Jira 이�?? �??�??/�?��??/링크 매�?? (provider=jira 일 �?? �?��?�) |
| `github.*` | GitHub 라벨/�?일�?��?� 매�?? (provider=github 일 �?? �?��?�). �?��?�: [SPEC-provider-github.md](./SPEC-provider-github.md) |
| `media.*` | 미�??�?� �?리 �?��? (provider-agnostic) |

### Provider�? �??�?? �?��??

| provider | �??�?? config �?��?? | �?고 |
|----------|-----------------|------|
| `jira` | `jira` | `github` �?��?? 무�?? |
| `github` | `github` | `jira` �?��?? 무�?? |

---

## 4. state.json �?��?��?

```json
{
  "run_id": "20260404-001",
  "provider": "jira",
  "project_ref": "PROJ",
  "epic_ref": null,
  "source_issue_ref": null,
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
      "status": "pending",              // "pending" | "in_progress" | "completed" | "escaped"
      "started_at": null,
      "completed_at": null,
      "output": "devplan-manifest.json",// �?��?? "devplan-blocked-report.md"
      "pending_review": true
    }
  }
}
```

### PhaseStatus �?�거�??

```
"pending" | "in_progress" | "completed" | "escaped"
```

- `escaped`: split phase�?��??�? �?�?�. �??�? 조건 감�? �?? �?��? (SPEC-skills.md §2.2 Step 4.5).

### EscapeCode �?�거�??

| Code | �?��?� | �?��?? |
|------|------|------|
| `E2-1` | 구체�?? �??�?? �?? �?보 �?족 | �?족 �?보 목록 + 인�? 보�?? �??청 |
| `E2-2` | 모�??/충�? �?견 | 충�? �?점 �?�?? + 인�? �?�?�결�? �??청 |
| `E2-3` | �?�?� �?�??�?? �?? 이미 적�? 크기 | Phase 3 직�?? �?�?� |
| `EC-1` | 이�?� �?�? �?? �?��?� �?�?� | �?�?? �?결 + �?�? 구조�?? |
| `EC-2` | �?�본 결�?� �?견 | 결�?� 리포�?� (Phase 1 �?��?증 �?고) |

### �?��?? �?이 �?�?

```
validate.status == "completed" && validate.result in ["PASS", "PASS_WITH_WARNINGS"]
  �?? split �?�?? �?�?� (PASS_WITH_WARNINGS �?? 경고 �??�??)

split.status == "completed" && split.pending_review == false
  �?? devplan �?�?? �?�?�

split.status == "escaped" && split.escape_code == "E2-3"
  �?? devplan �?�?? �?�?� (�?�?� �?�??�?? �?? 적�? 크기)

split.status == "escaped" && split.escape_code in ["E2-1", "E2-2", "EC-1", "EC-2"]
  �?? devplan �?�?? �?�? �?? �?��?��?� �?�?? �??�??

devplan.status == "completed" && devplan.pending_review == false
  �?? 매�??�??�?��?� �?��?? �?�?� (imbas:manifest)
```

---

## 5. �??�?젝�?� 캐�?? �?��?��?

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

## 6. Manifest �?��?��?

### stories-manifest.json (Phase 2 �?력)

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
      "title": "�??�?? �?그인�?��? �?��? �?�??",
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

### devplan-manifest.json (Phase 3 �?력)

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
      "title": "OAuth provider �?�?��?? �?이�?� 구�??",
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
      "comment": "Story AC�? OAuth scope과 �?�??�? �?��? scope �?일�? �?? devplan�?��?? �?�? 매�??",
      "type": "mapping_divergence",
      "status": "pending"
    }
  ],
  "execution_order": [
    { "step": 1, "action": "create_tasks", "items": ["T1"] },
    { "step": 2, "action": "create_task_subtasks", "items": ["T1-ST1", "T1-ST2"] },
    { "step": 3, "action": "create_links", "items": ["T1�??S1-a", "T1�??S1-b"] },
    { "step": 4, "action": "create_story_subtasks", "items": ["S1a-ST1", "S1a-ST2"] },
    { "step": 5, "action": "add_feedback_comments", "items": ["S1-a"] }
  ]
}
```

---

## 7. .gitignore �?��? �?리

`imbas:setup` �?��?? �?? `.imbas/` �?�?��??�?� .gitignore �?��?�:

```gitignore
# imbas auto-generated �?? do not edit
*
```

�?��?? �??�?젝�?� 루�?� `.gitignore`�?� `.imbas/` �?�? (setup-lens �?��?�과 �?일):
1. `.git` 존�?� �??인
2. `git check-ignore -q .imbas` �??인
3. 미�?�록이면 `.gitignore`�?� `.imbas/` �?�?

---

## Related

- [SPEC-provider.md](./SPEC-provider.md) �?? Provider �?�?��?? 인�?��??이�?�
- [SPEC-provider-jira.md](./SPEC-provider-jira.md) �?? Jira provider 구�??
- [SPEC-provider-github.md](./SPEC-provider-github.md) �?? GitHub provider 구�??
- [SPEC-skills.md](./SPEC-skills.md) �?? �?��??를 읽고 �?��?? �?��?� �?�?
- [SPEC-agents.md](./SPEC-agents.md) �?? �?��?? 기�?�?��? �?�??�??�?? �?�이�?�?�
- [BLUEPRINT.md](../BLUEPRINT.md) �?? �?체 �??�?��?��?
���?�?�
- [BLUEPRINT.md](../BLUEPRINT.md) �?? �?체 �??�?��?��?
