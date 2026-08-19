# maencof-lens — Contract

## Requirements

- 이 패키지는 볼트에 대해 읽기 전용이다. 볼트 파일시스템에 쓰지 않고, `@ogham/maencof` 의 `kg_build`·mutation 핸들러를 import 하지도 호출하지도 않는다. 패키지가 수행하는 유일한 쓰기는 `writeConfig` 의 렌즈 설정 갱신이며, 그 대상은 호스트 워크스페이스(또는 사용자 config 레이어)의 런타임 파일이라 어떤 볼트 루트 아래에도 없다.
- 모든 MCP 툴 호출은 레이어 가드를 통과한다. 유효 레이어는 `computeEffectiveLayers(vaultLayers, layerFilter)` 의 교집합이며, 호출별 필터가 볼트 설정 상한을 넓히지 못한다. 교집합이 비면 throw 하지 않고 볼트 상한 전체로 되돌아간다 — 전체 레이어로 열리지 않는다.
- 볼트 상한의 기본값은 `DEFAULT_LAYERS`(L2–L5)다. L1 은 기본 상한 밖이며, 볼트 항목이 `layers` 에 1 을 명시할 때만 들어온다 — 이 패키지의 어느 경로도 상한에 레이어를 더하지 않는다.
- 어댑터는 maencof 계약을 재구현하지 않는다. 랭킹·시드 의미·레이어 모델은 `@ogham/maencof` 가 소유하고 이 패키지는 상한 적용과 오류 표면만 더한다. maencof 배럴 경계는 additive 로만 바뀐다 — 심볼 제거가 곧 이 패키지의 파손이다.
- config 루트는 `MAENCOF_LENS_CONFIG_ROOT` → 호스트 워크스페이스 루트 순으로 해석하고 `process.cwd()` 로 폴백하지 않는다(플러그인 설치 디렉터리를 프로젝트로 오인한다). 루트가 없으면 서버 기동과 툴 등록은 성공하고, 툴 호출이 env 설정을 안내하는 에러를 돌려준다.

## API Contracts

- npm 표면의 정본은 `package.json` 의 `exports` 다 — 루트 서브패스 하나만 공개하며, `sideEffects: false` 가 훅 번들에서 비기여 재노출을 제거한다.
- 플러그인 표면의 정본은 `.claude-plugin/plugin.json` 이다 — skills 디렉터리와 MCP 서버 정의를 가리킨다. 루트의 동명 매니페스트(`plugin.json` 등)는 plugin compiler 산출물이라 여기서 계약을 갖지 않으며 손편집 대상이 아니다.
- MCP 서버 이름은 `maencof-lens`, 서버 정의의 키는 `tools` 다. 따라서 agent·skill 이 참조하는 전체 툴 이름은 `mcp__plugin_maencof-lens_tools__<tool>` 이다.
- 공개 MCP 툴은 `search` · `context` · `navigate` · `read` · `status` 5종이고 전부 읽기 전용이다. 이름의 정본은 `src/constants/mcpToolNames.ts` 이며, 툴 추가·제거는 공개 계약 변경이다.
- 각 툴의 인자·응답 형태는 해당 핸들러 fractal 의 DETAIL 이 소유한다. 이 문서는 그 위에 걸리는 읽기 전용·레이어 상한 불변만 고정한다.
- 실행 진입점은 esbuild 산출물(MCP 서버 번들과 훅 번들)이고, 그 원본 경계는 `src/DETAIL.md` 가 소유한다.

## Acceptance Criteria

### AC-vault-read-only — 볼트 읽기 전용

- 볼트 경로를 대상으로 하는 쓰기 호출이 0건이다.
- `@ogham/maencof` 의 mutation·빌드 핸들러가 이 패키지의 어느 소스에서도 import 되지 않는다.
- 쓰기가 존재하는 유일한 지점은 렌즈 설정 파일이며, 그 경로는 어떤 볼트 루트 아래에도 있지 않다.

### AC-layer-ceiling-not-widened — 상한 확장 불가

- 볼트 상한 밖 레이어를 담은 `layer_filter` 는 상한 안 레이어만 남긴 채 maencof 로 전달된다.
- 교집합이 비면 throw 없이 볼트 상한 전체가 전달된다 — 전체 레이어로 열리지 않는다.
- `layer_filter` 를 생략해도 전달되는 레이어는 볼트 상한이다.

### AC-l1-outside-default — 기본 상한에서 L1 제외

- 기본 설정으로 만든 볼트 항목의 `layers` 는 L2–L5 이며 1 을 포함하지 않는다.
- 그 설정에서 L1 문서는 어느 툴의 결과에도 — 본문·클러스터 열거 포함 — 나타나지 않는다.

### AC-tool-surface-read-only — 5종 읽기 전용 툴

- 서버가 등록하는 툴은 `search` · `context` · `navigate` · `read` · `status` 5종이다.
- 다섯 핸들러 모두 레이어 가드를 거치며, 어느 쪽도 볼트 쓰기 경로에 도달하지 않는다.

### AC-config-root-no-cwd — config 루트 폴백 금지

- config 루트가 해석되지 않으면 툴 호출이 env 설정을 안내하는 에러를 돌려주고, `process.cwd()` 를 프로젝트 루트로 삼지 않는다.

## Last Updated

2026-08-20 — 패키지 진입점·MCP 툴 표면·레이어 가드 불변을 계약으로 고정했다.
