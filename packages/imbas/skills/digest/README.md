# digest

Jira 이슈의 전체 컨텍스트(설명 + 댓글 스레드 + 미디어)를 구조화된 요약으로 압축하여 Jira 댓글로 게시한다.

## 개요

긴 논의 이력이 있는 Jira 이슈에서 핵심 의사결정, 거부된 대안, 기술적 제약, 미해결 이슈를 추출하여
3계층 압축 구조(경영진 요약 → 카테고리별 추출 → 원문 근거)로 정리한다.
State Tracking + QA-Prompting 하이브리드 방식을 사용한다.

## 워크플로우

1. **이슈 읽기** — `read-issue` 스킬로 전체 이슈 로드, 첨부 미디어는 `fetch-media`로 분석
2. **State Tracking** — 타임라인 구성 (t0: 이슈 생성 → tN: 각 댓글의 상태 전이)
3. **QA-Prompting** — 6가지 질문으로 핵심 추출
   - 어떤 결정이 내려졌는가? / 왜? / 거부된 대안은? / 기술적 제약은? / 미해결 이슈? / 주요 참여자와 역할?
4. **3계층 압축**
   - Layer 3: 1-2문장 경영진 요약
   - Layer 2: 카테고리별 추출 (결정, 제약, 거부, 미해결)
   - Layer 1: 원문 근거 (최소한의 인용)
5. **댓글 포맷팅** — digest 마커가 포함된 마크다운 댓글 생성
6. **미리보기/게시** — `--preview`로 확인만, 기본값은 확인 후 Jira에 게시

## Digest 마커

```html
<!-- imbas:digest v{version} | generated: {ISO8601} | comments_covered: {start}-{end} -->
```

재실행 시 기존 digest를 감지하여 이후 댓글만 추가 분석한다.

## 자동 제안 트리거

다음 조건을 모두 충족하면 digest를 제안:
- `imbas:manifest`를 통한 Done 전이 발생
- 댓글 3개 이상
- 작성자 2명 이상

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `getJiraIssue` | Atlassian MCP | 이슈 읽기 (read-issue 경유) |
| `addCommentToJiraIssue` | Atlassian MCP | digest 댓글 게시 |
| `fetchAtlassian` | Atlassian MCP | 첨부 미디어 다운로드 |
| `read-issue` | 내부 스킬 | 구조화된 이슈 컨텍스트 |
| `fetch-media` | 내부 스킬 | 첨부 미디어 분석 |

## 참고 파일

- `references/workflow.md` — 워크플로우 상세
- `references/digest-marker.md` — digest 마커 형식 및 재실행 동작
- `references/suggestion-trigger.md` — 자동 제안 조건
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
