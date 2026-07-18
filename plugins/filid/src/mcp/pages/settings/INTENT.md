## Purpose

`open_settings` 도구가 기동하는 설정 페이지 프런트엔드. `.filid/config.json`
(8 규칙 enabled/severity/exempt, language, scan.maxDepth, additional-\* 배열)과
`.claude/rules/` rule doc 적용 상태를 한 폼에서 편집한다. 웹 폼이므로 배포
상태를 pre-check 로 표시할 수 있어 CLI 체크박스의 재선택 강제 결함이 없다.

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
- rule doc 체크박스는 `deployed` 를 pre-check; drift 는 `[UPDATE]` 배지 + 재동기 체크로 표현
- 상태 배지는 채도 아닌 treatment (모노 대문자 + 박스) 로 구분
- 저장 성공 시 "Claude Code 로 복귀" 안내 후 탭 자동 닫기 (long-poll 재개 신호)
- dirty 상태에서 이탈 시 `beforeunload` 확인

## Boundaries

### Always do

- 모든 사용자 노출 텍스트(`index.html`·`app.js` 라벨·힌트·메시지)는 영문만 사용 — `[filid:lang]` 무관
- 모든 인터랙션 요소에 라벨·focus-visible 상태, 44px 이상 터치 타깃
- 폼 필드 구조 변경 시 서버 저장 스키마(`settingsTypes.ts`)와 동기

### Ask first

- 폼 필드 추가/제거 (저장 페이로드 계약 변경)
- 새 서버 엔드포인트 의존 추가

### Never do

- 외부 폰트/스크립트/이미지 로드 (토큰 게이트 서버에 비토큰 정적 라우트 없음 — 전부 인라인)
- `eval` / inline event handler 사용
- 프레임워크(React 등) 또는 빌드 스텝 도입

## Dependencies

- 런타임: 로컬 설정 서버 API (`POST /save`·`/close`) — 각 요청에 `?token=` 부착
