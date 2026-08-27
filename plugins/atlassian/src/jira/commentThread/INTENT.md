[filid:lang:ko]

## Purpose

Jira Data Center 에 설치된 서드파티 reply 플러그인의 댓글을 표준 코멘트 + 이슈 changelog(`field == "Comment"`) + 루트 코멘트 entity property 로부터 결정적으로 병합해 시간순 스레드로 돌려준다. 인스턴스별 해석 규칙은 사용자 데이터 영역의 `comment-profiles.json` 이 담고, 이 fractal 이 그 파일을 소유한다.

## Structure

| 경로               | 역할                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `commentThread.ts` | read · scan · probe · save_profile 오케스트레이션                                                  |
| `operations/`      | 순수 함수 — changelog 추출, 병합, 정렬, 잘림 감지, 프로필 제안, digest, 입력 검증                  |
| `requests/`        | 효과 있는 요청 함수 — 코멘트 페이지, changelog, property, search, 프로브 (주입된 `request`만 사용) |
| `profile/`         | `comment-profiles.json` 로드·원자 저장 (user 계층 전용, 0o600)                                     |
| `__tests__/`       | fixture F1~~F12 · F13~~F21 · P1~~P6 와 가짜 요청·별도 프로세스 기반 검증                           |

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

## Dependencies

- `core/httpClient` — `executeRequest` (기본 `request`)
- `utils/index` — `attachPrefix`, `extractHostname`
- `types/index` — `CommentProfileSchema`, `CommentProfileFileSchema`, thread 타입
- `constants/index` — `COMMENT_PROFILES_PATH`
- `@ogham/cross-platform` — 파일 락, 조건부 읽기, 임시 파일 정리
