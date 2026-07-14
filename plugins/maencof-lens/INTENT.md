# maencof-lens

maencof 볼트 지식에 대한 읽기 전용 MCP 접근을 개발 컨텍스트에 제공하는 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Structure

- `src/config/` — `.maencof-lens/config.json` 로더
- `src/vault/` — 다중 볼트 라우팅 및 그래프 캐싱
- `src/filter/` — 레이어 필터링 로직
- `src/tools/` — 5개 MCP 툴 핸들러 (`search`/`context`/`navigate`/`read`/`status`)
- `src/mcp/` — MCP 서버 설정
- `src/hooks/` — SessionStart 스킬 가이드 주입
- `skills/` — 3개 스킬 (setup, lookup, brief)
- `agents/` — 1개 에이전트 (researcher)

## Conventions

- 볼트 접근은 읽기 전용; 볼트 파일시스템에 쓰기 금지
- 핸들러는 `@ogham/maencof`에서 import; 로직 중복 금지
- 레이어 필터링: 볼트 설정 상한과 호출별 필터의 교집합 적용
- config 루트(= `.maencof-lens/` 상위 디렉터리) 해석 순서: `MAENCOF_LENS_CONFIG_ROOT` env → 호스트 워크스페이스 루트. 둘 다 없으면 config 루트는 `null` 이고 툴 호출은 env 설정을 안내하는 에러를 반환한다. 서버를 워크스페이스가 아닌 플러그인 설치 디렉터리에서 기동하는 호스트에서는 env 로 지정한다.

## Boundaries

### Always do

- 그래프 로드 전 볼트 경로 존재 여부 검증
- 모든 툴 호출에 레이어 가드 적용
- status 응답에 인덱스 만료 경고 포함

### Ask first

- 읽기 전용 5개 툴 외 새 MCP 툴 추가 시
- 레이어 필터링 교집합 로직 변경 시

### Never do

- 볼트 파일시스템에 쓰기 (문서, 인덱스, 메타데이터)
- maencof의 kg_build 또는 mutation 핸들러 호출
- 어떤 툴에서도 레이어 필터링 우회
- config 루트를 `process.cwd()` 로 폴백 (플러그인 설치 디렉터리를 프로젝트로 오인)
