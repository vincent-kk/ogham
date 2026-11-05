## Purpose

통계 의미를 평가하지 않는 실행 기반 레이어다. R 실행·격리·안전 게이트·잡 상태의 경계를 조립하며 MCP 프로토콜은 소유하지 않는다.

## Conventions

- 각 프랙탈은 독립 Bounded Context: 서로의 internal 파일 직접 import 금지(배럴 경유)
- 실행 안전만 — 통계 정책(가정·기법 적합성)은 평가하지 않음
- 1함수 1파일(`operations/*.ts`), 공유 상태는 eponymous 파일

## Boundaries

### Always do

- 새 실행-안전 관심사는 해당 프랙탈에 배치
- 프랙탈 간 호출은 `index.ts` 배럴 경유

### Ask first

- 새 core 프랙탈 추가 (예: jobStore 외 신규 런타임 상태)

### Never do

- 통계 의미·도메인 어휘를 core 에 도입
- MCP 도구 핸들러 로직을 core 에 누설 (core 는 mcp 를 모름)
