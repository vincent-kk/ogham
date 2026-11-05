# mcp — maencof 도구 서버 경계

## Purpose

MCP 서버와 도구 핸들러를 소유하며 stdio 전송으로 Claude Code와 통신한다.

## Conventions

- 서버 실행 진입점은 정상 부팅과 detached finalizer를 배선한다. 종료 정리가 새 서버를 띄우지 않도록 두 경로를 분리한다.
- 문서 CRUD·빌드는 파일 I/O를 조립하고 파싱·그래프 계산·전용 저장소 정책은 core에 위임한다. 도구가 저장소 정책을 복제하면 호출 경로마다 검증이 갈라진다.

## Boundaries

### Always do

- 도구 입력은 Zod 스키마로 검증
- 서버 등록과 도구 핸들러 구현을 분리
- `toolResult`와 `toolError` 헬퍼 사용
- 쓰기 도구(create/update/delete/move/capture_insight/kg_build) 성공 시 invalidateCache() 호출

### Ask first

- 새 도구 추가 시 입출력 타입 정의 필요 여부
- 그래프 캐시 무효화 전략 또는 `ensureFreshGraphNonBlocking` 로직 변경
- BLOCKED_PREFIXES 목록 변경 (보안 영향)

### Never do

- 직접 I/O로 core가 소유한 전용 저장소의 검증·영속화 경계를 우회
- 서버 실행 진입점을 라이브러리 API로 재노출 (버전 참조를 거슬러 순환이 된다)
- esbuild 진입점에 서버·마이그레이션·finalizer 구현을 인라인
- getVaultPath() 우회 또는 vault 경로 하드코딩
