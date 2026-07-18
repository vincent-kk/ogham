## Purpose

`open_settings` 도구가 기동하는 설정 페이지 프런트엔드. `.imbas/config.json`
전체(provider, project 참조, 라이프사이클 라벨 6종, 언어 4종, LLM 모델·subtask
한도, provider별 고급 섹션)를 한 폼에서 편집한다. 세션만 아는 데이터(가용
provider, 감지된 repo, Jira 프로젝트 목록)는 LLM 이 `bootstrap` 인자로 주입한다.

## Structure

| Path             | Role                                                                |
| ---------------- | ------------------------------------------------------------------- |
| `index.html`     | 폼 마크업 + 상태 주입 슬롯 (`__IMBAS_STATE__`)                      |
| `styles/`        | `styles.css` — cennad 설정 페이지 디자인 언어 (다크 OLED 단색 토큰) |
| `scripts/app.js` | 상태 prefill·provider 조건부 렌더·검증·`/save`·`/close` POST        |

## Conventions

- 디자인은 cennad `pages/settings` 를 따른다 — `shell/masthead/section` 골격, 헤어라인 섹션 구분, 전면 모노스페이스, 흰색 primary 버튼, 하단 actions + aria-live status
- provider 선택은 radio 칩; 선택에 따라 project 필드와 provider별 고급 `<details>` 섹션이 전환
- 고급/부가 설정(Defaults, Jira advanced, GitHub advanced)은 접이식 `<details>` 로 구성
- 미노출 값(`version`, `defaults.codebase`, 비활성 provider 섹션)은 주입 상태를 그대로 보존해 재전송
- GitHub 라벨 프로비저닝 의사는 `options.provision_labels` 체크박스로 저장 페이로드에 동승 (config 아님)
- 서버 발급 토큰을 `location.search` 에서 읽어 모든 POST 에 `?token=` 부착
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
