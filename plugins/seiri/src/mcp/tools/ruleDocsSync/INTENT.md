# ruleDocsSync — 헤드리스 배포 경로 + 다이얼

## Purpose

브라우저를 띄울 수 없는 호스트와 스크립트 setup 을 위한 `.claude/rules/`
조회·조정 도구. 대화형 경로는 설정 페이지(`open_settings`)이고 이쪽은
그 폴백이다. **다이얼 조작(`config`)도 여기가 흡수한다** — 3번째 도구를
만드는 대신.

## Structure

- `ruleDocsSync.ts` — `handleRuleDocsSync` (action 디스패치)
- `utils/applyConfigAction.ts` — `config` action (조회·set·clear)
- `index.ts` — barrel

## Conventions

- action 5종: `status`(지금 배포 상태) · `manifest`(빌드가 담은 것) ·
  `plan`(dry-run) · `sync`(적용) · `config`(다이얼).
- `plan` 은 `sync` 와 같은 판정 함수를 경유한다 — 페이지를 못 여는 호출자도
  먼저 diff 를 보여줄 수 있어야 한다.
- `selections` 에서 빠진 id 는 **해제**로 읽는다(배포 파일 제거). 이 의미는
  도구 설명에 명시되어 있어야 한다.
- 드리프트는 `resync` 에 id 가 있을 때만 덮어쓴다.
- `config` 는 플러그인 루트 확인보다 **먼저** 분기한다 — 템플릿이 안 잡히는
  환경이야말로 seiri 를 낮추고 싶은 순간이다.
- `config` 응답의 `posture` 는 그 자체가 세션 주입이다. 다이얼을 옮긴 턴에
  바로 적용되게 하는 유일한 경로이므로 비워 두지 않는다.

## Boundaries

### Always do

- `plan` 을 먼저 제안할 수 있도록 설명 문구를 유지.
- 소비처(스킬) 문서와 action 집합을 동기화.

### Ask first

- action 추가·제거 (스킬 계약).
- 입력 필드명 변경.

### Never do

- 세션 훅에서 호출.
- 매니페스트에 없는 파일 쓰기·삭제.
- 사용자 확인 없이 로컬 편집 덮어쓰기.
- `config` 에서 기준선(`.seiri/config.json`) 쓰기 — setup 표면 전용.
