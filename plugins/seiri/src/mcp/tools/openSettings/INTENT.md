# openSettings — 설정 페이지 + bounded long-poll

## Purpose

`127.0.0.1` 전용 설정 서버를 띄워 브라우저 폼(규칙 선택 + 다이얼)을 열고,
사용자의 저장/닫기를 **정해진 시간 안에서 기다렸다가** 결과를 반환한다.
기다림이 있어야 setup 스킬이 URL 만 던지고 멈추는 대신 같은 턴에서 이어간다.

## Structure

```
openSettings.ts  handleOpenSettings — 서버 재사용/기동 + awaitSettled
types/           organ — 페이지 상태·저장 페이로드(zod)·settle 타입
utils/           organ — 상태 조립 · plan · persist · 선택 추출 · HTML 로드
webServer/       sub-fractal — HTTP 서버, 가드, 라우팅, 핸들러
```

## Conventions

- 응답은 `{ status: 'saved' | 'closed' | 'pending', url, summary? }` 고정.
- 모듈 레벨 `currentServer` 싱글톤 — `pending` 후 재호출이 같은 세션을 이어
  기다린다. 다른 프로젝트 요청이 오면 교체한다.
- 대기는 `[1, MAX_WAIT_SECONDS]` 로 클램프하고 `extra.signal` 을 전파한다.
- 종료 상태(`saved`·`closed`)는 토큰 없는 origin 만 돌려준다 — 흐름이 끝난 뒤
  일회용 토큰을 다시 노출하지 않는다.
- `SEIRI_NO_BROWSER=1` 이면 탭을 열지 않는다 (e2e·헤드리스).
- **`/plan` 과 `/save` 는 같은 본문 스키마와 같은 판정을 쓴다** — 미리보기가
  save 가 하지 않을 일을 약속하면 미리보기가 없느니만 못하다.

## Boundaries

### Always do

- 저장은 core (`writeConfig`·`applyRuleDocs`) 경유.
- 프로젝트 루트는 `host-paths` 의 `projectRoot(path?)` 로 해석.

### Ask first

- 응답 스키마 변경 (setup 스킬 계약).
- 대기 상한 변경.

### Never do

- `127.0.0.1` 외 바인딩, CORS 와일드카드.
- 토큰 검증을 `@ogham/http-guard` 밖에서 재구현.
- 상한 없는 대기.
