# openSettings — Contract

## Requirements

- 로컬 설정 폼을 띄우고 bounded long-poll 로 저장·닫힘을 기다린다 — 사용자가 설정을 마치면 같은 턴에서 작업을 이어갈 수 있어야 한다.
- 서버는 `127.0.0.1` 에만 바인딩한다.
- 가드는 공유 `@ogham/http-kit` 을 재사용한다 — 토큰·Origin 검증을 재구현하지 않는다.
- 미리보기 revision 과 저장 시점의 새 계획이 같을 때만 적용한다. 그 사이 파일이 바뀌었다면 사용자가 본 것과 다른 것을 적용하는 셈이다.
- 프로젝트 루트는 `@ogham/cross-platform` 의 `projectRoot(path?)` 로 해석하며 `process.cwd()` 폴백을 두지 않는다.

- 본문의 `scope` 는 **결정 하나**다 — 다이얼이 저장되는 레이어와 규칙이 배포되는 레이어를 함께 정한다. 축을 둘로 가르면 같은 질문을 두 번 묻고 두 답이 어긋날 수 있다.
- `/plan` 과 `/save` 는 같은 본문 스키마와 같은 판정을 쓴다. 미리보기가 save 가 하지 않을 일을 약속하면 미리보기가 없느니만 못하다.
- 대기는 `[1, MAX_WAIT_SECONDS]` 로 clamp 하고 `extra.signal` 을 전파한다. 상한 없는 대기는 없다.
- 종료 상태(`saved`·`closed`)는 토큰 없는 origin 만 돌려준다 — 흐름이 끝난 뒤 일회용 토큰을 다시 노출하지 않는다.
- `OGHAM_NO_BROWSER` 가 설정되면 탭을 열지 않는다(e2e·헤드리스).

## API Contracts

- `handleOpenSettings(...)` — 응답은 `{ status: 'saved' | 'closed' | 'pending', url, summary? }` 로 고정이다. `pending` 후 재호출은 모듈 레벨 싱글톤이 같은 세션을 이어 기다리며, 다른 프로젝트 요청이 오면 서버를 교체한다.
- `webServer/` — 로컬 HTTP 서버, 가드, 라우팅, 핸들러.
- `types/` — 페이지 상태·저장 페이로드(zod)·settle 타입.
- `utils/` — 상태 조립·plan·persist·선택 추출·HTML 로드.

## Acceptance Criteria

### AC-settle-bounded — 유계 대기

- 저장·닫힘·만료 셋 중 하나로 반드시 종결된다.

### AC-revision-match — 미리보기 일치

- 미리보기 이후 대상이 바뀌면 적용하지 않는다.

### AC-loopback-only — 바인딩 격리

- 서버가 `127.0.0.1` 외 주소에서 접근 가능하지 않다.

## Last Updated

2026-07-30 — 설정 도구의 long-poll·revision 일치 계약을 문서화했다.
