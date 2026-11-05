# maencof-lens — 읽기 전용 볼트 접근 플러그인

## Purpose

maencof 볼트 지식에 대한 읽기 전용 MCP 접근을 개발 컨텍스트에 제공하는 Claude Code 플러그인. Windows 호환성은 [`.metadata/cross-platform/`](../../.metadata/cross-platform/) 에서 추적.

## Conventions

- 볼트 접근은 읽기 전용; 볼트 파일시스템에 쓰기 금지
- 핸들러는 `@ogham/maencof`에서 import; 로직 중복 금지
- 레이어 필터링: 볼트 설정 상한과 호출별 필터의 교집합 적용
- config 루트는 설정 디렉터리의 상위이며 해석 순서는 `MAENCOF_LENS_CONFIG_ROOT` env → 호스트 워크스페이스 루트다. 둘 다 없으면 config 루트는 `null` 이고 툴 호출은 env 설정을 안내하는 에러를 반환한다. 서버를 워크스페이스가 아닌 플러그인 설치 디렉터리에서 기동하는 호스트에서는 env 로 지정한다.

## Boundaries

### Always do

- 그래프 로드 전 분할 인덱스의 커밋 마커를 확인하고, 구형 인덱스만 있으면 로드하지 않는다 — maencof 로더는 구형 인덱스를 볼트에 다시 기록한다. 로드 실패는 세션을 막지 않고, 이미 로드한 그래프는 읽기 가용성을 위해 유지한다.
- 문서 조회에는 레이어 가드를 적용하고, 문서의 경로·제목·본문 없이 볼트 전체 인덱스의 개수·시각만 보고하는 status 집계는 필터 대상에서 제외한다
- status 응답에 인덱스 만료 경고 포함

### Ask first

- 현재 읽기 전용 도구 표면 밖에 새 MCP 툴 추가 시
- 레이어 필터링 교집합 로직 변경 시

### Never do

- 볼트 파일시스템에 쓰기 (문서, 인덱스, 메타데이터)
- maencof의 kg_build 또는 mutation 핸들러 호출
- 어떤 툴에서도 볼트 설정의 레이어 상한 밖 문서의 경로·제목·본문 반환 (status 는 개수 집계만 보고)
- config 루트를 `process.cwd()` 로 폴백 (플러그인 설치 디렉터리를 프로젝트로 오인)
