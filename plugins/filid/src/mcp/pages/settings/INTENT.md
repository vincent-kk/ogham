## Purpose

`open_settings` 도구가 기동하는 설정 페이지 프런트엔드. config v2의 adapter 선택, 규칙 override, language, structure 설정과 현재 host target의 rule doc 상태를 한 폼에서 편집한다.

## Structure

| Path             | Role                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `index.html`     | 폼 마크업 + 상태 주입 슬롯 (`__FILID_STATE__`)                      |
| `styles/`        | `styles.css` — cennad 설정 페이지 디자인 언어 (다크 OLED 단색 토큰) |
| `scripts/app.js` | 상태 prefill·동적 렌더·검증·`/save`·`/close` POST                   |

## Conventions

- 디자인은 cennad `pages/settings` 를 따른다 — `shell/masthead/section` 골격, 헤어라인 섹션 구분, 전면 모노스페이스, 흰색 primary 버튼, 하단 actions + aria-live status
- 의존성 없는 vanilla JS, SVG 아이콘만 (이모지 금지)
- 서버 발급 토큰을 `location.search` 에서 읽어 모든 POST 에 `?token=` 부착
- rule doc 체크박스는 `deployed` pre-check, drift 는 `[UPDATE]` 배지 + 재동기 체크, 대상은 공유 manager 의 `displayTarget`
- 저장 레이어는 헤더 브레드크럼의 `config_scope` 토글이 정해 `/save` 본문의 `scope` 로 간다. config 를 소유한 세 섹션에 `data-config-path`, 상속 상태는 `data-scope-state` — 계약 정본은 `@ogham/cross-platform` 의 `DETAIL.md` "설정 페이지 계약"
- 이 페이지는 minify 만 거치고 번들되지 않으므로 공유 모듈을 import 하지 않는다. 서버가 계산해 넘긴 `overridden` 목록만 쓴다
- 상태 배지는 채도 아닌 treatment (모노 대문자 + 박스) 로 구분
- 저장 성공 시 "Claude Code 로 복귀" 안내 후 탭 자동 닫기 (long-poll 재개 신호)
- dirty 상태에서 이탈 시 `beforeunload` 확인

## Boundaries

### Always do

- 모든 사용자 노출 텍스트(`index.html`·`app.js` 라벨·힌트·메시지)는 영문만 사용 — `[filid:lang]` 무관
- 모든 인터랙션 요소에 라벨·focus-visible 상태, 44px 이상 터치 타깃
- 폼 필드 구조 변경 시 서버 저장 스키마(`settingsTypes.ts`)와 동기
- 화면에 노출하지 않은 adapter·structure 설정은 저장 시 보존

### Ask first

- 폼 필드 추가/제거 (저장 페이로드 계약 변경)
- 새 서버 엔드포인트 의존 추가

### Never do

- 외부 폰트/스크립트/이미지 로드 (토큰 게이트 서버에 비토큰 정적 라우트 없음 — 전부 인라인)
- `eval` / inline event handler 사용
- 프레임워크(React 등) 또는 빌드 스텝 도입
- 재정의 해제 버튼 추가 — project 레이어는 팀이 커밋으로 소유하는 파일이라, 없애는 일은 설정 클릭이 아니라 git 작업이다

## Dependencies

- 런타임: 로컬 설정 서버 API (`POST /save`·`/close`) — 각 요청에 `?token=` 부착
