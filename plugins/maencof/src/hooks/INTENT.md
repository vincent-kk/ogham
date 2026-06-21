# hooks

## Purpose

Claude Code 훅 이벤트 핸들러. 세션 시작/종료, 도구 사용 전후 처리. 이벤트별 단일 디스패처(`eventDispatch`)가 각 이벤트의 관심사 핸들러를 한 프로세스에서 순차 실행한다.

## Boundaries

### Always do

- shared.ts 유틸리티 함수 사용
- 이벤트 진입점은 `eventDispatch` 가 단독 소유; 관심사는 자체 fractal 핸들러로 유지
- configRegistry에 설정 등록

### Ask first

- 새 이벤트/관심사 추가 시 build-hooks.mjs (`entryPath`) 업데이트 필요
- `eventDispatch` 진입점·병합 계약 변경

### Never do

- core/ 모듈 직접 수정
- 훅 간 순환 의존
- stale-node, 캐시 무효화, freshness 가드 등 인덱서 내부 상태를 훅으로 처리 (MCP server middlewares 책임)
- 사용자 프롬프트나 도구 응답에 인덱서 내부 상태 노출
