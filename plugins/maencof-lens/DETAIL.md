# maencof-lens — Contract

## Requirements

- 이 패키지는 볼트에 대해 읽기 전용이다. 볼트 파일시스템에 쓰지 않고, `@ogham/maencof` 의 `kg_build`·mutation 핸들러를 import 하지도 호출하지도 않는다. 렌즈 설정 저장 대상이 등록된 볼트 루트 아래이면 `writeConfig`는 아무것도 쓰지 않고 오류를 던진다. 오류는 `MAENCOF_LENS_CONFIG_ROOT`를 볼트 밖 폴더로 지정하거나 사용자 계층에 저장하도록 안내하며, 저장 계층을 자동으로 바꾸지 않는다. setup 스킬도 파일 도구로 쓰기 전에 같은 검사를 수행하고 볼트 안 저장을 거부한다.
- 쓰기는 `writeConfig` 의 렌즈 설정 갱신과 호스트 상태 영역의 훅 진단 로그로 제한한다. 진단 로그는 훅 실패를 추적하기 위한 것이며, 기록 실패로 세션을 차단하지 않는다.
- 문서를 조회하는 MCP 툴은 레이어 가드를 통과한다. `status` 는 개수와 시각만 담는 집계라 볼트 전체의 인덱스 건강 상태를 알리도록 필터 대상에서 제외한다. 문서의 경로·제목·본문을 싣는 순간 상한 밖 문서가 드러나므로 `include_orphan_paths` 같은 문서 식별 옵션은 렌즈에서 열지 않는다. 유효 레이어는 `computeEffectiveLayers(vaultLayers, layerFilter)` 의 교집합이며, 호출별 필터가 볼트 설정 상한을 넓히지 못한다. 교집합이 비면 throw 하지 않고 볼트 상한 전체로 되돌아간다 — 전체 레이어로 열리지 않는다.
- 볼트 상한의 기본값은 `DEFAULT_LAYERS`(L2–L5)다. L1 은 기본 상한 밖이며, 볼트 항목이 `layers` 에 1 을 명시할 때만 들어온다 — 이 패키지의 어느 경로도 상한에 레이어를 더하지 않는다.
- 어댑터는 maencof 계약을 재구현하지 않는다. 랭킹·시드 의미·레이어 모델은 `@ogham/maencof` 가 소유하고 이 패키지는 상한 적용과 오류 표면만 더한다. maencof 배럴 경계는 additive 로만 바뀐다 — 심볼 제거가 곧 이 패키지의 파손이다.
- 스킬의 등록·조회 전제는 maencof의 분할 인덱스다. 커밋 마커와 필수 노드·엣지 샤드를 검사하며, 구형 단일 인덱스의 존재를 요구하지 않는다. 구형 인덱스만 있거나 필수 샤드가 없으면 maencof 세션에서 재빌드를 안내한다. 선택적 아카이브 샤드 부재는 등록을 막지 않는다.
- config 루트는 `MAENCOF_LENS_CONFIG_ROOT` → 호스트 워크스페이스 루트 순으로 해석하고 `process.cwd()` 로 폴백하지 않는다(플러그인 설치 디렉터리를 프로젝트로 오인한다). 루트가 없으면 서버 기동과 툴 등록은 성공하고, 툴 호출이 env 설정을 안내하는 에러를 돌려준다.
- 호스트별 bridge 분리는 설치 범위가 아니라 실행 경로의 분리다. 두 호스트 모두 전체 플러그인을 설치하고 MCP 번들과 Windows shim을 공유한다. Claude 실행은 Claude bridge, Codex 실행은 compiler의 `codexHookRuntime` 선택을 따른다.

## API Contracts

- npm 표면은 패키지 exports, 플러그인 표면은 `.claude-plugin/plugin.json`이 정본이다. 루트 동명 매니페스트는 compiler 산출물이므로 손편집하지 않는다.
- `sideEffects: false`는 훅에서 비기여 재노출을 제거하기 위한 선언이다.
- 서버 정의 키와 전체 MCP 이름 형식을 유지한다. agent·skill은 `mcp__plugin_maencof-lens_tools__<tool>`을 참조한다.
- 도구 추가·제거는 공개 계약 변경이다. 인자·응답은 각 핸들러 계약이 소유하고 패키지는 읽기 전용·레이어 상한을 보장한다.

## Acceptance Criteria

### AC-skill-sharded-index — 스킬의 분할 인덱스 인식

- setup의 init·add는 graph-meta.json, nodes.json, edges.json이 있는 볼트를 index.json 없이 등록할 수 있다.
- lookup·brief는 동일한 필수 파일을 안내하며, 실제 파싱·검색 가능 여부는 MCP 도구의 로드 결과로 판단한다.
- 구형 단일 인덱스 또는 미완성 분할 인덱스만으로 등록을 진행하지 않고, 렌즈에서 인덱스를 생성하거나 마이그레이션하지 않는다.

### AC-vault-read-only — 볼트 읽기 전용

- 볼트 경로를 대상으로 하는 쓰기 호출이 0건이다.
- `@ogham/maencof` 의 mutation·빌드 핸들러가 이 패키지의 어느 소스에서도 import 되지 않는다.
- 쓰기 지점은 렌즈 설정 파일과 훅 진단 로그로 제한한다. 등록된 볼트 루트 아래의 렌즈 설정 저장은 파일 생성·갱신 없이 거부하고 볼트 밖 설정 루트 또는 사용자 계층을 안내한다. setup은 작업 폴더가 등록된 볼트 안인지 쓰기 전에 확인하며, 자동으로 다른 계층을 선택하지 않는다.

### AC-tool-surface-read-only — 5종 읽기 전용 툴

- 서버가 등록하는 툴은 `search` · `context` · `navigate` · `read` · `status` 5종이다.
- 문서 조회 핸들러는 레이어 가드를 거치고 `status` 는 문서의 경로·제목·본문 없이 볼트 전체 인덱스의 개수·시각 집계만 보고한다. 어느 핸들러도 볼트 쓰기 경로에 도달하지 않는다.

## Last Updated

읽기 전용·레이어 상한·호스트 실행 경계의 내용이나 적용 범위가 바뀔 때 갱신한다.
