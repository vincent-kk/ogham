## Purpose

`open_settings` 도구가 기동하는 로컬 웹 UI 의 프런트엔드 소스. 빌드 시 `scripts/buildSettingsHtml.mjs` 가 CSS·JS 를 inline + minify 해 `public/settings.html` 로 빌드한다 (런타임에 디스크에서 읽어 서빙).

## Conventions

- 외부 CDN·이미지 의존 금지 (빌드 시 단일 HTML); token 은 URL 쿼리 `?token=<...>` 에서 읽어 동일 origin XHR 에 재전달; POST body 는 항상 `Content-Type: application/json`; CSS 변수로 다크 모드 토큰화
- The `#config_scope` radio controls `configByScope[scope]` prefill and the save scope. It uses the server-provided initialScope: existing project, otherwise existing user, otherwise project. Project is disabled only when its path is unavailable, not when its config file is missing. Adopting server state preserves the selection.
- user artifact 안내의 active home은 초기 page 응답이 `__CENNAD_STATE__.activeHome`으로 주입한 런타임 경로를 `textContent`로 표시한다. 프런트엔드는 호스트 루트를 다시 계산하지 않는다
- tier 는 `apex`/`high`/`mid`/`low` 4종이며 provider 마다 4행 모두 노출 — apex 도 다른 tier 와 동등하게 임의 model/effort 를 매핑할 수 있다 (기본값만 최상위)
- liveness 한도는 기본값으로 충분하므로 접힌 고급 설정으로 두며 입력 단위는 분, 저장 단위는 ms다. 변환 지식은 한 함수 쌍에만 둬 단위 혼동을 막는다.
- antigravity per-tier model + effort 드롭다운 — `parseAgyModel` 이 표시명 괄호(`Gemini 3.6 Flash (High)`)와 `agy models` slug 접미사(`gemini-3.6-flash-high`; `AGY_VARIANT_SUFFIXES` 미러)를 **둘 다** base/variant 로 분해하고 디스크 값도 로드 시 같은 규칙으로 정규화한다 — 안 하면 slug 가 통째로 model 축에 들어가 effort 축이 전부 `(no effort)` 로 죽는다. 저장은 `{model: base, effort: variant}`, dispatch 가 표기에 맞춰 재조합. effort 비활성 원인은 둘로 구분(`keptAgyEffort`): 카탈로그 미독해면 저장값 보존, variant 없는 모델(`claude-sonnet-4-6`)이면 제거(남기면 `<model>-high` 를 조립해 agy 가 거부). 카탈로그는 provider-status 응답의 `agyModels`
- ratio segment는 clipping track 안에, handle은 바의 직접 자식으로 둔다. 한 부모에 섞으면 handle이 마지막 자식을 차지해 끝 segment 모서리가 깨진다. 음영은 provider 이름이 아니라 바 안의 위치로 정해 카드 순서 변경에도 그라데이션을 유지한다.
- provider 별 advanced panel 의 `crosscheck only` 토글 → `ratio.<provider>.crosscheck_only`. 켜면 훅 자동 선출에서 빠져 crosscheck·명시 호출 전용이 되고(enabled 와 별개 축, 비율 0% 로 대체 불가), ratio bar 계산(`routableProviders`)에서도 빠져 나머지가 100% 를 재분배한다. 단 **자기 `value` 는 손대지 않고 그대로 저장**하되 카드에는 `—` 로 표시해 보이는 합이 100 을 넘지 않게 하고(저장 합이 100 을 넘어도 훅은 electable 만 본다), 키워드 입력란은 disabled 되되 값은 보존한다. 호스트 자신의 provider 제외는 훅 런타임 자동 판정이라 UI 컨트롤이 없다
- codex 레인: yolo/sandbox 컨트롤 + per-tier model 및 effort 드롭다운 — model 선택 항목은 provider-status 응답의 `codexModels` 카탈로그(실패 시 정적 fallback), effort 선택 항목은 선택된 model 이 광고한 집합으로 제한. codex 는 미지원 effort 를 다운그레이드하지 않고 API 에러로 실패시키므로 UI 가 원천 차단한다
- Claude 권한 선택지는 headless 위임에 맞는 모드로 한정하고 effort 선택지는 모델에 맞춘다.
- 독립 "MCP Addons" 섹션 (provider 라우팅과 분리) — `addons.youtube` = enabled + language(en/ko) + targets(claude·codex·antigravity). save 요청이 체크된 대상 CLI 의 사용자 MCP 설정에 yt-dlp-mcp 서버를 등록/해제 (cennad 네임스페이스 밖 부수효과)

## Boundaries

### Always do

- 모든 사용자 노출 텍스트(마크업과 client script의 라벨·힌트·placeholder·메시지)는 영문만 사용 — `[filid:lang]` 무관
- 모든 fetch 호출에 `?token=` 부착
- `prefers-reduced-motion` 존중
- 사용자 입력은 inlined `__CENNAD_STATE__` 만 신뢰

### Ask first

- 폼 필드 추가 또는 키 이름 변경
- 새 라우트 추가

### Never do

- `eval`, `Function('...')`, inline event handler 사용
- 외부 origin 으로 fetch
- 커밋된 settings page 빌드 산출물 직접 수정
