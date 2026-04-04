# `imbas:read-issue`

Jira 이슈를 전체 댓글 스레드와 함께 읽어 구조화된 JSON 요약을 반환하는 내부 스킬.

## 개요

Jira 이슈의 메타데이터, 설명, 댓글을 읽어 대화 맥락을 재구성하고,
의사결정, 미해결 질문, 참여자 역할 등을 추출하여 구조화된 JSON으로 반환한다.
validate, split, devplan, `imbas:digest` 스킬 및 각 에이전트에서 내부적으로 호출한다.

## 사용법

```
imbas:read-issue <issue-key> [--no-cache] [--depth shallow|full]

--no-cache   : 캐시 무시, Jira에서 직접 재조회
--depth      : shallow = 메타데이터 + 설명만 / full = 댓글 포함 (기본: full)
```

## Digest 댓글 Fast Path

기존 imbas digest 댓글(`<!-- imbas:digest ... -->`)이 감지되면:
- 새 댓글이 없을 경우 → digest를 완전한 컨텍스트로 사용 (빠른 경로)
- 새 댓글이 있을 경우 → 새 댓글만 처리 후 digest와 병합
- digest가 없으면 → 전체 댓글을 처리하는 Full Path로 진행

## 출력 스키마 (주요 필드)

```json
{
  "key": "PROJ-123",
  "summary": "...",
  "type": "Story",
  "status": "In Progress",
  "participants": [{ "name": "...", "role_hint": "...", "comment_count": 3 }],
  "decisions": [{ "date": "...", "by": "...", "content": "..." }],
  "open_questions": [{ "date": "...", "by": "...", "content": "..." }],
  "latest_context": "...",
  "conversation_summary": "...",
  "digest_found": true,
  "new_comments_after_digest": 2
}
```

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `getJiraIssue` | Atlassian MCP | 이슈 메타데이터, 설명, 댓글 조회 |

에이전트 스폰 없음. 스킬이 직접 실행하고 구조화된 데이터를 반환한다.

## 참고 파일

- `references/workflow.md` — 워크플로우 상세 (Fast Path / Full Path)
- `references/output-schema.md` — 출력 JSON 전체 스키마
- `references/caching-and-usage.md` — 캐싱 정책 및 에이전트별 사용 패턴
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
