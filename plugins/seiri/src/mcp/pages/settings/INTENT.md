# settings — 설정 페이지 정적 자산

## Purpose

규칙 선택·다이얼·**저장 전 diff** 를 한 폼에 담은 로컬 페이지. 빌드가 `index.html` + `styles/` + `scripts/` 를 `public/settings.html` 한 장으로 인라인하고, 서버가 요청마다 상태를 주입해 서빙한다.

## Structure

- `index.html` — 골격 + `__SEIRI_STATE__` 주입 슬롯
- `styles/styles.css` — cennad 디자인 언어(다크·모노스페이스·모노크롬)
- `scripts/app.js` — 렌더 + `/plan` · `/save` · `/close` 호출

## Conventions

- **독립 스크립트**다 — `src/` 의 서버 모듈을 import 하지 않는다. 브라우저에서 단독 실행되며 번들러를 거치지 않는다.
- 상태는 `window.__SEIRI_STATE__` 로만 들어온다. 슬롯 문자열이 미니파이 후에도 남아야 하므로 `build-settings-html.mjs` 가 이를 검사한다.
- 체크박스 기본값은 **파일시스템 상태**에서 온다. 배포된 게 하나도 없을 때만 `recommended` 를 미리 체크한다 — 손으로 지운 규칙이 되살아나지 않도록.
- 드리프트 행은 최신 배포 템플릿으로 교체하는 선택을 **행마다 기본 체크**한다. 사용자가 체크를 해제하면 로컬 편집을 보존하며, 일괄 덮어쓰기는 없다.
- 선택이 바뀔 때마다 `/plan` 을 다시 불러 diff·revision 을 갱신한다.
- 고급 정보는 접이식 `<details>` 안에 둔다.
- **헤더 브레드크럼의 `config_scope` 토글이 페이지 전역을 정한다** — 다이얼이 저장되는 계층과 규칙 문서가 배포되는 채널을 같은 선택이 결정하고, 다이얼 값과 규칙 체크박스는 그 계층의 것으로 다시 앉는다(user 는 자기 파일 단독, project 는 없으면 user 상속). 필드 소유자는 `data-config-path`, 상속 상태는 `data-scope-state` — 계약 정본은 `@ogham/cross-platform` 의 `DETAIL.md` "설정 페이지 계약".
- 서버가 두 계층의 규칙 스냅샷을 함께 싣는다. 토글이 움직이면 목록·채널 라벨은 손에 있는 상태로 다시 그리고, `/plan` 만 왕복한다 — 채널 경로는 페이지가 조립하지 않는다(Codex 에서 채널은 디렉터리가 아니라 `AGENTS.md` 의 소유 섹션이다).
- **재정의 해제 버튼은 두지 않는다.** project 계층은 팀이 커밋으로 소유하는 파일이라, 없애는 일은 설정 클릭이 아니라 git 작업이다.

## Boundaries

### Always do

- 사용자 문자열은 `textContent` 로만 넣는다 (`innerHTML` 금지).
- drift 규칙은 최신 배포 템플릿 적용을 기본값으로 제시하고, 로컬 편집 보존 선택도 같은 행에 명시.

### Ask first

- 새 폼 섹션 추가.
- 디자인 토큰 변경 (다른 플러그인 설정 페이지와 어긋남).

### Never do

- 서버 모듈 import, 외부 네트워크 요청·폰트·CDN.
- 저장 전에 파일이 바뀐 것처럼 보이게 하는 낙관적 렌더.
