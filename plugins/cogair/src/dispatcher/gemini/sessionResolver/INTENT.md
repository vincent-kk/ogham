## Purpose

gemini-cli `--list-sessions` stdout 을 파싱해 `{ index, uuid, title }` 항목 배열을 생성하고,
UUID → 현재 integer index 매핑을 resume 직전마다 재해결.

## Structure

| Path                        | Role                                             |
| --------------------------- | ------------------------------------------------ |
| `parseListSessions.ts`      | line-based regex 파싱 → `GeminiSessionEntry[]`   |
| `findLatestSession.ts`      | start 직후 가장 최근 항목으로 UUID 캡처          |
| `findSessionByUuid.ts`      | resume 시 stored UUID 로 현재 integer index 조회 |
| `constants/entryPattern.ts` | 정규식 패턴 + 필드 캡처 그룹 위치 상수           |
| `index.ts`                  | 세 함수 배럴                                     |

## Conventions

- integer index 는 매번 재계산 — 디스크에 저장하지 않음
- UUID(`sessionId`) 만 영속화 대상 (`externalSessionRef`)
- UUID 는 소문자 정규화 후 비교 (`toLowerCase`)
- 매핑 실패 시 `null` 반환 → 호출자가 `unknown` 에러로 변환
- `--list-sessions` 실패는 dispatch 전체 실패로 전이

## Boundaries

### Always do

- UUID 가 현재 list 에 없으면 `null` 반환 (재시작 불가 신호)
- `parseListSessions` 결과가 빈 배열이면 즉시 `null` 반환

### Ask first

- `--list-sessions` 출력 포맷 변경 대응 (regex 패턴 수정)
- `GeminiSessionEntry` 필드 추가 또는 타입 변경

### Never do

- integer index 를 디스크에 캐시
- cogair `sessionId` 와 gemini UUID(`sessionId` 필드) 혼동 — 항상 별개로 취급
- 외부 npm 의존성 import

## Dependencies

- `../../../types` (gemini session entry 타입)
- 외부 npm 의존성 없음 — 순수 string / regex 처리
