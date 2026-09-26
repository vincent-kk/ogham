# src

## Purpose

maencof 플러그인 소스 루트. 5-Layer Knowledge Model v3 기반 개인 지식 공간 관리자.

## Structure

- `core/` 는 순수 비즈니스 로직 소유가 원칙이지만 vault I/O 경계도 여기서 끝난다 — I/O 를 한 층에 몰아두기 위한 결정이며, 예외 모듈 목록은 아래 `Always do` 가 정본이다.

## Conventions

- 라이브러리 표면은 `index.ts` 하나이고 export 를 이름으로 열거한다 — 여기 없는 심볼은 계약이 아니다
- 서버 생성 함수(`createServer`·`startServer`)는 표면에 올리지 않는다. 배럴이 서버 모듈을 끌어오면 `version.ts` 참조와 맞물려 src → mcp → mcp/server → src 순환이 된다
- 세션 마감은 MCP 서버 수명주기(shutdown·다음 부팅 bootSweep)가 소유한다. 훅은 매 턴 `session-touch` 만 기록하고, 세션 종료 기록의 주소는 sessionStore 하나다

## Boundaries

### Always do

- types/ 중앙 타입을 import하여 사용
- core/ 모듈은 순수 함수로 유지 (I/O 예외: vaultScanner, insightStats, transitionHistory, errorLog, autonomy, cacheManager, turnContext)
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
