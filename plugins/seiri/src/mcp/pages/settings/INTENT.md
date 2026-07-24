# settings — 설정 페이지 정적 자산

## Purpose

규칙 선택·다이얼·**저장 전 diff** 를 한 폼에 담은 로컬 페이지. 빌드가
`index.html` + `styles/` + `scripts/` 를 `public/settings.html` 한 장으로
인라인하고, 서버가 요청마다 상태를 주입해 서빙한다.

## Structure

- `index.html` — 골격 + `__SEIRI_STATE__` 주입 슬롯
- `styles/styles.css` — cennad 디자인 언어(다크·모노스페이스·모노크롬)
- `scripts/app.js` — 렌더 + `/plan` · `/save` · `/close` 호출

## Conventions

- **독립 스크립트**다 — `src/` 의 서버 모듈을 import 하지 않는다. 브라우저에서
  단독 실행되며 번들러를 거치지 않는다.
- 상태는 `window.__SEIRI_STATE__` 로만 들어온다. 슬롯 문자열이 미니파이 후에도
  남아야 하므로 `build-settings-html.mjs` 가 이를 검사한다.
- 체크박스 기본값은 **파일시스템 상태**에서 온다. 배포된 게 하나도 없을 때만
  `recommended` 를 미리 체크한다 — 손으로 지운 규칙이 되살아나지 않도록.
- 드리프트 행의 "덮어쓰기"는 **행마다 따로** 체크한다. 일괄 덮어쓰기 없음.
- 선택이 바뀔 때마다 `/plan` 을 다시 불러 diff 를 갱신한다.
- 고급 정보는 접이식 `<details>` 안에 둔다.

## Boundaries

### Always do

- 사용자 문자열은 `textContent` 로만 넣는다 (`innerHTML` 금지).
- 파괴적 동작(로컬 편집 덮어쓰기)은 기본 해제 상태로 제시.

### Ask first

- 새 폼 섹션 추가.
- 디자인 토큰 변경 (다른 플러그인 설정 페이지와 어긋남).

### Never do

- 서버 모듈 import, 외부 네트워크 요청·폰트·CDN.
- 저장 전에 파일이 바뀐 것처럼 보이게 하는 낙관적 렌더.
