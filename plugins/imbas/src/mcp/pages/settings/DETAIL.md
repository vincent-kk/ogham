# settings — Contract

## Requirements

- `open_settings` 가 여는 설정 페이지 프런트엔드다. `.imbas/config.json` 전체(provider, project 참조, 라이프사이클 라벨 6종, 언어 4종, LLM 모델, estimation 계수, provider별 고급 섹션)를 한 폼에서 편집한다.
- 세션만 아는 데이터(가용 provider, 감지된 repo, Jira 프로젝트 목록)는 페이지가 조회하지 않는다. LLM 이 `bootstrap` 인자로 주입한다.
- 편집 대상 계층은 `#config_scope` 라디오(user/project)가 정한다. 폼은 `configByScope[scope]` 로 다시 앉고, `/save` 는 `scope` 를 실어 그 계층만 덮어쓴다.
- 폼에 노출하지 않는 값(`version`, `defaults.codebase`, 비활성 provider 섹션)은 주입된 상태 그대로 보존해 재전송한다 — 드롭하면 저장이 조용한 삭제가 된다.
- 모든 사용자 노출 텍스트는 영문만 쓴다. `[filid:lang]` 과 무관한 이 페이지 고유 규칙이다.
- 외부 폰트·스크립트·이미지를 로드하지 않는다. 토큰 게이트 서버에 비토큰 정적 라우트가 없어 전부 인라인이어야 한다.

## API Contracts

| Path             | 역할                                                          |
| ---------------- | ------------------------------------------------------------- |
| `index.html`     | 폼 마크업 + 상태 주입 슬롯 `__IMBAS_STATE__`                  |
| `scripts/app.js` | 상태 prefill · provider 조건부 렌더 · 검증 · `/save`·`/close` |
| `styles/`        | `styles.css` — 다크 OLED 단색 토큰                            |

- 서버와의 계약은 두 엔드포인트뿐이다: `POST /save`, `POST /close`. 두 요청 모두 `location.search` 에서 읽은 서버 발급 토큰을 `?token=` 으로 부착한다.
- `/save` 페이로드는 `scope` 와 config 본문, 그리고 config 가 아닌 부수 의사(`options.provision_labels`)를 함께 싣는다. 스키마 정본은 `src/types/settings.ts` 다.
- `scope.layers.project` 가 없으면 project 옵션은 disabled 이고 폼은 user 계층으로 연다.
- 저장 성공 시 복귀 안내 후 탭을 자동으로 닫아 도구의 long-poll 을 해소한다. dirty 상태 이탈은 `beforeunload` 로 확인한다.

## Acceptance Criteria

### AC-settings-english-only — 영문 전용 UI

- `index.html` 과 `scripts/app.js` 의 사용자 노출 문자열이 영문(라틴 문자)으로만 쓰였다 — 한글·CJK 등 비라틴 문자가 없다.
- 조판 문자(`·` · `—` · `…`)는 이 기준의 예외다. 언어가 아니라 활자이므로 영문 전용을 깨지 않는다.

### AC-settings-no-external-assets — 외부 자산 부재

- `index.html` 에 외부 호스트를 가리키는 `src`·`href` 가 없다.
- `scripts/app.js` 에 `eval` 호출이 없고 `index.html` 에 inline event handler 속성이 없다.

### AC-settings-scope-roundtrip — 계층 왕복

- `/save` 요청 본문에 `scope` 필드가 항상 포함된다.
- `scope.layers.project` 가 없는 상태로 로드하면 project 라디오가 disabled 이고 선택 계층이 user 다.

### AC-settings-preserve-hidden — 미노출 값 보존

- 주입 상태의 `version` 이 `/save` 페이로드에 같은 값으로 실린다.
- 비활성 provider 섹션의 값이 저장 후에도 유지된다.

### AC-settings-token-attached — 토큰 부착

- `/save` 와 `/close` 요청 URL 에 `token` 쿼리 파라미터가 있다.

## Last Updated

2026-08-06 — 계층 선택(`#config_scope`)과 미노출 값 보존을 포함한 설정 페이지 계약을 최초 문서화했다.
