[filid:lang:ko]

# commentThread — reply 플러그인 댓글 스레드 복원

## Purpose

Jira Data Center 에 설치된 서드파티 reply 플러그인의 댓글을 표준 코멘트 + 이슈 changelog(`field == "Comment"`) + 루트 코멘트 entity property 로부터 결정적으로 병합해 시간순 스레드로 돌려준다. 인스턴스별 해석 규칙은 사용자 데이터 영역의 `comment-profiles.json` 이 담고, 이 fractal 이 그 파일을 소유한다.

## Conventions

- 효과 경계로 organ 을 가른다 — 순수 병합·판정, 원격 요청, 프로필 파일 I/O 가 서로 다른 곳에 산다. 순수 쪽은 요청 함수와 시각을 인자로 받으므로 가짜 요청만으로 검증된다.
- 실패 등급은 둘뿐이다: 코멘트 API 실패는 치명, 보강 경로(changelog·property)는 열화되어 warning 으로 남는다.
- 프로필 파일 하나가 여러 사이트 항목을 담으므로, 저장은 통째 덮어쓰기가 아니라 다른 사이트 항목을 보존하는 병합이다.
- 프로필 부재 `hint` 는 스킬 문서 `skills/jira/tools/comment/schema.md` 의 "Thread clues" 절을 경로로 가리킨다 — 도메인 코드가 스킬 문서와 맺는 유일한 결합이며, 그 절 제목이나 파일 경로를 바꾸면 `operations/buildNoProfileHint.ts` 의 상수를 함께 바꾼다.

## Boundaries

### Always do

- `read` 는 프로필이 없거나 `standard`/`unknown` 이면 표준 코멘트만 돌려준다 — 오류가 아니다.
- changelog·property 실패는 열화(warning)이고 코멘트 API 실패만 치명이다.
- 성공 응답도 wire shape 를 검증하며 malformed changelog 는 열화, malformed comment·search 는 명시적 오류다.
- property 키는 `PropertyKeySchema` 를 통과한 값만, `encodeURIComponent` 로 경로에 넣는다.
- 저장은 `save_profile` 모드에서만, 공용 파일 락 아래 `<path>.temp` → `rename` 으로 원자 교체하고 다른 사이트 항목을 보존한다.

### Ask first

- 레시피 상수(`CHANGELOG_COMMENT_FIELD`, property 필드 이름) 를 프로필로 옮기는 것 (schemaVersion 2)
- property 조회 상한(50)·동시성(4)·코멘트 상한(1000) 변경

### Never do

- LLM 컨텍스트로 원시 changelog 를 돌려보내지 않는다 — 병합 결과와 warnings 만 반환한다.
- 원격 응답을 근거로 프로필 파일을 자동 재작성하지 않는다.
- `fetch` 직접 호출, `mcp/` import.
