## Purpose

maencof 볼트 지식에 대한 읽기 전용 MCP 접근을 개발 컨텍스트에 제공하는 플러그인 소스 루트.

## Structure

- `config/` — `.maencof-lens/config.json` 설정 관리
- `vault/` — 다중 볼트 라우팅 및 그래프 캐싱
- `filter/` — 레이어 필터링 로직
- `tools/` — 5개 MCP 읽기 전용 툴 핸들러
- `mcp/` — MCP 서버 설정 및 진입점
- `hooks/` — SessionStart 스킬 가이드 주입
- `__tests__/` — 단위 테스트 (organ)

## Boundaries

### Always do

- 볼트 접근은 읽기 전용으로 유지한다
- 모든 하위 모듈을 index.ts를 통해 재수출한다

### Ask first

- 읽기 전용 5개 툴 외 새 MCP 툴 추가 시
- 레이어 필터링 교집합 로직 변경 시

### Never do

- 볼트 파일시스템에 쓰기
- maencof의 mutation 핸들러 호출
