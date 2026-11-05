# mcp — Contract

## Requirements

- stdio 전송으로 도구를 제공하는 MCP 서버 구현을 소유한다. vault 경로는 `MAENCOF_VAULT_PATH` 환경변수 또는 호스트 워크스페이스 루트에서 해석하며, 둘 다 해석되지 않으면 throw 한다.
- 모든 도구 입력은 Zod 스키마로 검증한다. 문서 CRUD와 빌드의 파일 I/O는 도구 경계에서 수행하고, 파싱·그래프 계산과 전용 저장소의 규칙은 core에 위임한다. 순수 계산에 디스크 의존성을 넣거나 저장소 검증을 우회하는 별도 writer를 만들지 않는다.
- 공통 host registry의 상태 루트와 `~/.config` exact/descendant는 canonical directory boundary 검사 뒤 vault 로 받지 않는다. 전역 설정 디렉터리를 지식 트리로 다루면 도구가 사용자 설정을 문서처럼 쓰고 지운다.
- 배럴은 라이브러리 API 만 노출한다. 실행 진입점인 `server/` 와 `serverEntry/` 는 재노출하지 않는다 — `serverEntry` 는 top-level `startServer()` 호출이라는 부수효과를 갖고, `server` 는 `server.ts → version.ts` 참조 때문에 재노출하면 `src → mcp → mcp/server → src` 순환이 된다. 실행 진입점은 서버 형제 배럴을 직접 가져간다.
- esbuild 진입점은 정상 부팅과 detached finalizer 실행을 분기하는 배선만 소유한다. 정상 부팅은 best-effort 마이그레이션 뒤 서버에, finalizer는 공유 runner와 lifecycle에 위임한다 — 종료 정리 때문에 두 번째 서버를 띄우거나 진입점에 정리 로직을 복제하면 안 된다.
- 그래프 캐시 무효화는 쓰기 도구의 계약이다. `create` · `update` · `delete` · `move` · `capture_insight` · `kg_build` 성공 시 `invalidateCache()` 가 호출된다.
- KG 그래프와 무관한 쓰기는 캐시를 무효화하지 않는다. `companion_edit` 은 preview 경로를 순수하게 유지해야 하고, `capture_personal_context` 는 개인 컨텍스트 전용 메타데이터 레코드만 다루므로 둘 다 read 래퍼로 등록한다.
- read-path 는 in-flight rebuild 를 await 하지 않는다. `ensureFreshGraph` 가 stale 감지 시 비차단 증분 반영을 하고, `loadGraphIfNeeded` 는 자동 리빌드 없이 캐시/디스크만 읽는 진단용(`kg_status`) 경로다. 중복 동시 리빌드는 뮤텍스가 막는다.
- 도구별 출력 계약과 rendering convention 은 각 도구 fractal이 소유한다. 이 문서에 복제하지 않는다.

## API Contracts

서버 실행 진입점은 라이브러리 표면에 올리지 않는다. 실행 부수효과와 버전 참조 순환을 막기 위한 경계다.

L5는 서브레이어 위임 없이 buffer_type으로 분류하는 평면 수용소이므로 별도 경계 문서 생성 도구를 두지 않는다. 도구 이름과 등록 표면은 상수 및 등록부에서 확인한다.

## Acceptance Criteria

### AC-readable-vault-maintenance — Composable maintenance

- Disk inventory enumerates references beyond graph neighbor limits and remains available with an unbuilt or stale graph. It is read-only and uses scanner I/O.
- Same-layer moves, full-body updates and child creation compose into a source-preserving maintenance workflow. Integration fixtures verify exact reference target identities, fragments, aliases, source metadata, collisions and retries; skill behavior requires a separate reviewed execution record.

### AC-no-direct-io-in-handlers — 저장소 소유권 보존

- 문서 CRUD·빌드의 직접 I/O는 도구가 소유하고, core가 소유한 파싱·그래프 계산·전용 저장소 정책은 도구에 복제하지 않는다.

### AC-server-entry-thin — 진입점 최소화

- 실행 진입점은 마이그레이션·서버 시작과 detached finalizer를 배선하고, 각 구현은 소유 모듈에 위임한다.

## Last Updated

실행 진입점·도구 소유권·캐시 정책이 바뀔 때 갱신한다.
