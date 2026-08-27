# commentThread — Contract

## Requirements

- R1 병합: 표준 코멘트 → changelog `field == "Comment"` 항목 추출 → 루트 코멘트 property 로 중첩·삭제 보정 → 루트 `created`·임의 정밀도 숫자 `id` 순, 각 루트 아래 댓글도 같은 순서.
- R2 프로필: 저장 레코드는 `{ pattern, propertyKeys, verifiedAt }`, `save_profile` 입력에서는 `verifiedAt` 을 생략할 수 있고 저장 시각으로 덮어쓴다. 파일 `schemaVersion: 1`, 사이트 키는 hostname. 키 charset `^[A-Za-z0-9_.-]{1,64}$`, 최대 8개이며 probe 제안도 같은 스키마를 만족한다.
- R3 중첩 표기는 best-effort — property 의 `last_thread_body` 가 존재하고 그 루트의 최신 댓글 본문(정규화)과 같을 때만 `nested`·`deleted` 를 기록하며, 부재·불일치는 warning 으로 남긴다.
- R4 스캔: `GET /search?jql&expand=changelog&fields=summary` 를 50건씩 페이징해 `Comment` 항목 보유 이슈만 보고한다 — (a)형 전용.
- R5 열화: changelog 잘림은 `complete: false` + warning, changelog 실패는 `complete: "unknown"`, 코멘트 상한 도달 시 미수집 루트를 orphan 으로 단정하지 않음, scan changelog 부재는 `complete: false`, probe 의 추출·property-key 실패는 `warnings[]` 와 `reason` 에 보존, 프로필 부재는 표준 코멘트 + hint. 페이지 offset 은 요청 크기가 아니라 실제 반환 건수만큼 전진한다.
- R6 저장: user 계층 `comment-profiles.json` 만, 0o600, 공용 파일 락 아래 `<path>.temp` 원자 교체, 타 사이트 보존, 기존 JSON envelope 가 현재 schema 와 맞지 않으면 덮어쓰지 않음, `pattern: "changelog"` 는 probe 가 발급한 `proposal_digest` 일치 필수.
- R7 wire 경계: 성공 HTTP 응답도 comment·search·changelog shape 를 런타임 검증한다. 치명적 comment/search shape 오류는 명시적 오류, 보조 changelog shape 오류는 warning 과 `complete: "unknown"` 으로 열화한다.

## API Contracts

- `readCommentThread(ctx, params, deps)` — `CommentThreadResult`.
- `scanCommentThreads(ctx, params, deps)` — `CommentThreadScanResult`.
- `probeCommentThread(ctx, params, deps)` — `CommentThreadProbeResult`; proposal 유무와 관계없이 `warnings[]` 를 전달한다.
- `saveCommentThreadProfile(ctx, params, deps)` — `CommentThreadSaveResult`.

## Acceptance Criteria

### AC-F1 — 기본 병합

- 표준 코멘트 2건 + 코멘트①을 `to` 로 갖는 changelog 댓글 2건 → 루트 2, ① 아래 댓글 2, 시간순.

### AC-F2 — 중첩 주석

- property `parent_thread_id` 가 루트 id 와 다르면 최신 댓글에 `nested: true`.

### AC-F3 — 오탐 없음

- changelog 에 상태·담당자 변경 항목만 있으면 댓글 0 건.

### AC-F4 — 플러그인 미설치

- `Comment` 항목·property 전무 → 표준 코멘트만, `complete: true`, warning 없음.

### AC-F5 — 잘림

- `changelog.total > histories.length` → `complete: false`, warning 에 누락 수.

### AC-F6 — 삭제 표기

- property `deleted: true` → 최신 댓글 `deleted: true`.

### AC-F7 — 스캔

- 이슈 3 건 중 1 건만 `Comment` 항목 → 그 1 건만 `issues[]` 에.

### AC-F8 — 프로필 부재

- 프로필 없음 → 표준 코멘트 + `hint`, 파일 생성 없음.

### AC-F9 — orphan

- 전체 페이징 모드에서 `to` 가 존재하지 않는 코멘트 id → `orphan: true` 항목이 스레드 끝에, warning 1 건.

### AC-F10 — 의심 중복

- 표준 코멘트와 author·정규화 본문·created(±2 초) 가 같은 changelog 댓글 → 삭제하지 않고 `suspectedDuplicate: true`.

### AC-F11 — 결정적 정렬

- `created` 가 같은 항목은 `id` 숫자 오름차순. 한 history 에 `Comment` 항목이 둘이면 id 는 `<historyId>:<index>`.

### AC-F12 — 비정상 입력

- `to` 가 null·비숫자면 skip + warning; `total` 부재면 잘림 판정 없이 `complete: true`; property 본문이 최신 댓글과 다르면 보정 생략 + warning.

### AC-F13 — 코멘트 상한

- 전체 조회가 1000건 상한에서 멈추면 이후 실제 루트를 가리키는 reply 를 orphan 으로 표시하지 않고 상한 warning 을 반환한다.

### AC-F14 — scan 응답 누락

- 검색 결과 이슈에 `changelog` 가 없으면 해당 이슈를 무응답으로 확정하지 않고 warning 과 `complete: false` 를 반환한다.

### AC-F15 — probe 경고 보존

- 비정상 changelog 항목과 property-key HTTP 실패를 proposal 유무와 관계없이 `warnings[]` 로 반환하고 플레이북이 이를 사용자에게 전달한다.

### AC-F16 — property 본문 증거

- `last_thread_body` 가 없거나 최신 reply 와 다르면 `nested`·`deleted` 를 설정하지 않고 warning 을 반환한다.

### AC-F17 — property parent 파싱

- `parent_thread_id` 의 null·boolean·빈 문자열·음수·소수·unsafe number 는 거부하고 안전한 비음수 정수 number 또는 임의 정밀도 숫자 문자열만 받는다. changelog `to` 도 같은 파서를 사용한다.

### AC-F18 — 큰 숫자 ID 정렬

- `Number.MAX_SAFE_INTEGER` 를 넘는 숫자 문자열 ID 도 정밀도 손실 없이 오름차순으로 정렬한다.

### AC-F19 — 서버 페이지 상한

- Jira 가 요청한 `maxResults` 보다 적은 건수를 반환해도 다음 offset 은 실제 반환 건수만큼만 전진해 comment 와 scan 항목을 건너뛰지 않는다.

### AC-F20 — 저장 가능한 probe 제안

- probe 는 property key charset 과 최대 8개 제한을 적용한 뒤 proposal 과 digest 를 만들며, 제외·초과 키 수를 reason 에 남긴다. 반환된 proposal 은 그대로 `save_profile` 입력 스키마를 통과한다.

### AC-F21 — 성공 응답 shape 검증

- 2xx comment/search 응답의 배열 shape 가 잘못되면 명시적 malformed 오류를 던지고, 2xx changelog shape 가 잘못되면 warning 과 `complete: "unknown"` 으로 열화한다.

### AC-P1 — 프로필 파싱

- 유효 파일 → 사이트별 `CommentProfile`; 없는 파일 → 빈 맵, warning 없음; JSON 파싱 실패 → 빈 맵 + warning 1 건.

### AC-P2 — 사이트별 격리

- 한 사이트 항목만 스키마 위반 → 그 사이트만 제외 + warning, 나머지 유효.

### AC-P3 — 버전 불일치

- `schemaVersion !== 1` → 빈 맵 + warning, 파일 무변경.

### AC-P4 — 원자 저장

- 저장 후 파일 mode `0o600`, 다른 사이트 항목 바이트 동일, `<path>.temp` 잔존 없음; 손상된 파일 위에 저장하면 명시적 오류로 거부.

### AC-P5 — envelope 보호

- foreign `schemaVersion` 또는 구조가 잘못된 유효 JSON 파일 위에는 저장하지 않고 원본을 그대로 둔다.

### AC-P6 — 동시 저장

- 별도 프로세스에서 서로 다른 사이트를 동시에 저장해도 파일 락으로 직렬화되어 두 항목을 모두 보존하고, 성공·실패 뒤 `<path>.temp` 와 소유 락을 남기지 않는다.

## Last Updated

2026-08-28 — reply 플러그인 댓글 스레드 복원 계약을 신설했다.
