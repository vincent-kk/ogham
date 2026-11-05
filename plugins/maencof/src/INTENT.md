# src

## Purpose

maencof 플러그인 소스 루트. 5-Layer Knowledge Model v3 기반 개인 지식 공간 관리자.

## Structure

- core는 순수 계산과 도메인별 저장소를 소유하고, MCP 문서 CRUD·빌드는 파일 I/O를 조립한다. 저장소 정책을 도구에 복제하거나 순수 계산에 디스크 의존성을 넣지 않기 위한 경계다.

## Conventions

- 라이브러리 표면은 `index.ts` 하나이고 export 를 이름으로 열거한다 — 여기 없는 심볼은 계약이 아니다
- 서버 생성 함수(`createServer`·`startServer`)는 표면에 올리지 않는다. 배럴이 서버 모듈을 끌어오면 `version.ts` 참조와 맞물려 src → mcp → mcp/server → src 순환이 된다
- 세션 마감은 MCP 서버 수명주기(shutdown·다음 부팅 bootSweep)가 소유한다. 훅은 매 턴 `session-touch` 만 기록하고, 세션 종료 기록의 주소는 sessionStore 하나다

## Boundaries

### Always do

- types/ 중앙 타입을 import하여 사용
- core/ 계산은 순수 함수로 유지하고, 디스크 I/O는 그 데이터의 저장 책임을 소유한 하위 모듈 경계에 가둔다 — 서버·훅의 수명주기와 저장 구현을 결합하지 않는다
- index.ts barrel export를 통해 외부 공개
- hooks/ 추가 시 configRegistry.ts에 등록하고 bridge/ 스크립트 빌드 확인

### Ask first

- 새 core/ 모듈 추가 시 index.ts export 갱신 필요 여부
- MCP 도구 추가 시 server.ts 등록 + Zod 스키마 + types/mcp.ts 타입 정의
- 아키텍처 버전(EXPECTED_ARCHITECTURE_VERSION) 변경 시 마이그레이션 로직 필요 여부

### Never do

- hooks/ 진입점 파일을 직접 import하지 않음 (esbuild 진입점)
- core/ 모듈에서 mcp/ 또는 hooks/ 직접 의존
- version.ts 직접 수정 (injectVersion.mjs 사용)
- bridge/ 출력 파일 직접 수정 (esbuild 생성 결과물)
