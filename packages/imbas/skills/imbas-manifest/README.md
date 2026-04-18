# imbas-manifest

stories-manifest 또는 devplan-manifest를 실행하여 Jira 이슈를 일괄 생성한다.

## 개요

`imbas:imbas-split` 단계에서 생성된 `stories-manifest.json` 또는 `imbas:imbas-devplan` 단계에서 생성된 `devplan-manifest.json`을 읽어
Epic, Story, Task, Sub-task, 링크, 댓글을 Jira에 일괄 생성한다.

핵심 설계 원칙:
- **크래시 복구**: 각 아이템 생성 후 즉시 매니페스트를 저장하여, 중간 실패 시 재실행이 안전
- **멱등성**: 이미 생성된 아이템(`status: "created"`)은 자동 스킵
- **Dry-run**: `--dry-run`으로 실제 생성 없이 계획 미리보기

## 선행 조건

- **stories manifest**: `split.status == "completed"` (또는 E2-3으로 escaped)
- **devplan manifest**: `devplan.status == "completed"`, `devplan.pending_review == false`

## 워크플로우

1. **매니페스트 로드** — 런 결정, 매니페스트 로드, 대기 항목 수 계산
2. **Dry-Run** (옵션) — 계획만 표시
3. **사용자 확인** — 타입, 프로젝트, 생성 예정 항목 수 표시 후 승인 요청
4. **일괄 실행**
   - stories 타입: Epic 생성 → Story 생성 → 링크 생성
   - devplan 타입: Task 생성 → Task Subtask 생성 → 링크 생성 → Story Subtask 생성 → 피드백 댓글 추가
5. **결과 보고** — 생성/스킵/실패 건수, 실패 항목 상세, 재실행 명령 안내

## 매니페스트 아이템 상태

| 상태 | 설명 |
|------|------|
| `pending` | 아직 생성되지 않음 |
| `created` | 생성 완료, `issue_ref` 할당됨 |
| `failed` | 생성 시도 실패 (재시도 가능) |
| `skipped` | 의도적으로 스킵됨 |

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `mcp_tools_manifest_get` | imbas MCP | 매니페스트 로드 |
| `mcp_tools_manifest_save` | imbas MCP | 아이템별 저장 (크래시 복구) |
| `mcp_tools_manifest_plan` | imbas MCP | dry-run 실행 계획 생성 |
| `[OP: create_issue]` | Jira ([OP:]) | Epic/Story/Task/Sub-task 생성 |
| `[OP: create_link]` | Jira ([OP:]) | 이슈 간 링크 생성 |
| `[OP: edit_issue]` | Jira ([OP:]) | 이슈 필드 수정 |
| `[OP: add_comment]` | Jira ([OP:]) | 피드백 댓글 추가 |

## 참고 파일

- `references/workflow.md` — 워크플로우 상세
- `references/state-transitions.md` — 상태 전이 및 선행 조건
- `references/errors.md` — 에러 처리 및 복구
- `references/tools.md` — 사용 도구 상세
