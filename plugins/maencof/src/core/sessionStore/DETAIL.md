# sessionStore — Contract

## Requirements

- 하루 한 파일이고 세션은 `sessions[sessionId]` 로 직접 조회한다. 전수조사하지 않으며 sweep 도 최근 일자 창으로 고정한다.
- 마감은 차분으로 한다: SessionStart 가 baseline 을 남기고, 매 턴 touch 가 `lastActivityAt`·`usageSnapshot` 을 갱신하고, sweep 이 `snapshot - baseline` 으로 마감한다.
- sweep 마감은 잠정적이다. baseline 과 snapshot 을 보존하므로 오마감된 세션에 새 활동이 오면 touch 가 다시 열고 sweep 이 멱등하게 재차분한다.
- 손상된 일자 파일은 빈 로그로 폴백한다 — 복구 가능한 데이터를 덮어쓰지 않는다.
- 자정을 넘긴 세션은 직전 일자의 미마감 레코드를 찾아 마감한다.
- usage 통계는 숫자 카운트만 쓴다. 레거시 비숫자 키는 무시한다.
- `.maencof-meta/sessions/*.md` 는 읽지도 쓰지도 않는다 — 세션 기록은 이 저장소 전용이다.

## API Contracts

- `getSessionsDir(cwd)` · `getSessionDayPath(cwd, date)` — 경로 파생.
- `recordSessionStart(cwd, ...)` — baseline 스냅샷 기록.
- `readSessionDayLog(cwd, date)` — 일자 로그. 부재·손상 시 빈 로그.
- `getRecentSessionSummary(cwd)` — 직전 세션 요약.
- `sweepStaleSessions(cwd, ...)` — 미마감 레코드 마감. 멱등.
- `touchSessionActivity` 는 배럴에 없다. 매 턴 훅이 concrete 경로로 소비하는 내부 단위다.

## Acceptance Criteria

### AC-idempotent-sweep — 멱등 마감

- 같은 세션에 sweep 을 두 번 돌려도 차분 결과가 같다.

### AC-reopen-on-touch — 재개방

- 마감된 세션에 touch 가 오면 레코드가 다시 열린다.

### AC-corrupt-day-log-fallback — 손상 폴백

- 파싱 불가 일자 파일에서 빈 로그를 반환하고 덮어쓰지 않는다.

## Boundary Exemptions

### `operations` — Hook bundle direct import

- **Consumers**: `**/src/hooks/**`
- **Direct import**: `allowed`
- **Reason**: 훅은 esbuild 번들로 배송되고 이벤트별 크기 가드를 받는다. 배럴을 거치면 재노출 그래프 전체가 번들에 끌려 들어와 가드를 넘긴다 — 배럴 경유는 선택지가 아니라 빌드 실패다. 매 턴 touch 는 애초에 배럴에 노출하지 않는 내부 단위이므로 훅이 concrete 경로로 소비하는 것이 설계된 형태다.

## Last Updated

2026-07-30 — 차분 마감·멱등 sweep 계약과 훅 직접 import 면책을 문서화했다.
