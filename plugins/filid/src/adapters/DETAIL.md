# adapters — Contract

## Requirements

- registry는 structure와 verification adapter를 독립적으로 등록하고 project claim을 해석한다.
- adapter detect 결과는 confidence와 재현 가능한 evidence를 가진다.
- 한 snapshot selection에서 각 adapter의 detect/discovery evidence를 한 번만 수집한다.
- 같은 파일을 같은 confidence로 소유한다고 주장하는 adapter가 둘 이상이면 `ambiguous-adapter-claim` 진단이다.
- 소유 adapter가 없는 파일은 `unsupported`이며 성공으로 숨기지 않는다.
- 호출자가 제외 디렉터리 이름을 지정하면 그 이름을 세그먼트로 담은 path는 ownership 후보에서 먼저 빠진다. 제외된 path는 `unsupported`도 아니고 진단도 만들지 않는다 — 제외는 "소유자를 찾지 못했다"가 아니라 "증거 대상이 아니다"이므로, 진단으로 남기면 제외의 목적인 미해결 참조 제거가 이름만 바뀐 채 그대로 남는다.
- explicit config의 미등록 adapter ID는 `unknown-adapter-id` validation 진단이다.
- 새 생태계 지원은 adapter 등록으로 추가되며 core type, policy와 MCP schema를 바꾸지 않는다.

## API Contracts

- `createAdapterRegistry(initial?)` — 중복 ID를 거부하고 structure/verification registry를 만든다.
- `resolveAdapters(projectRoot, adapters, options?)` — active claims, path ownership, unsupported paths와 diagnostics를 반환한다. `options.requestedPaths`는 discovery 결과 대신 판정할 path 집합이고, `options.excludedDirectoryNames`는 두 경로 모두에서 걸러낼 디렉터리 이름이다.
- `AdapterRegistry.registerStructure` / `registerVerification` — ID별 adapter 등록.
- `AdapterRegistry.selectStructure` / `selectVerification` — detect 없이 explicit ID validation과 등록 candidate 선택만 수행한다.
- `AdapterRegistry.resolveStructure` / `resolveVerification` — detect confidence가 양수인 adapter를 confidence 내림차순으로 반환.
- `StructureAdapter`는 source discovery, adapter별 entry point override 해석, entry point inspection, dependency extraction, framework peer 판정과 entry point 제안을 제공한다.
- `VerificationAdapter`는 verification file discovery, role, semantic case count와 DETAIL contract group marker를 제공한다.

## Acceptance Criteria

### AC-adapter-resolution — claim arbitration

- 단일 최고 confidence owner는 선택되고 evidence가 보존된다.
- 동률 owner는 `ambiguous-adapter-claim`, 무소유 path는 `unsupported`다.
- snapshot orchestration은 candidate selection 뒤 adapter detect를 반복하지 않는다.

### AC-adapter-excluded-directories — 제외 디렉터리

- 제외 이름을 세그먼트로 담은 path는 ownership에 들어가지 않고 `unsupported` 진단도 만들지 않는다.
- 제외는 이름 단위이며 경로상 위치와 무관하다. 제외 목록이 비면 판정 결과가 지정 이전과 동일하다.
- `requestedPaths`로 명시한 path에도 같은 제외가 적용된다.

### AC-adapter-extension — core 비변경

- 가짜 새 adapter를 등록하고 해석하는 테스트가 core/policy/MCP 변경 없이 통과한다.

### AC-adapter-portability — 설치 독립성

- adapter registry와 초기 adapter는 native addon, global npm lookup과 glob dependency 없이 동작한다.

## Last Updated

2026-07-30 — ownership 해석이 호출자가 지정한 제외 디렉터리 이름을 진단 없이 걸러내는 계약을 추가했다.
