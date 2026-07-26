# adapters — Contract

## Requirements

- registry는 structure와 verification adapter를 독립적으로 등록하고 project claim을 해석한다.
- adapter detect 결과는 confidence와 재현 가능한 evidence를 가진다.
- 같은 파일을 같은 confidence로 소유한다고 주장하는 adapter가 둘 이상이면 `ambiguous-adapter-claim` 진단이다.
- 소유 adapter가 없는 파일은 `unsupported`이며 성공으로 숨기지 않는다.
- explicit config의 미등록 adapter ID는 `unknown-adapter-id` validation 진단이다.
- 새 생태계 지원은 adapter 등록으로 추가되며 core type, policy와 MCP schema를 바꾸지 않는다.

## API Contracts

- `createAdapterRegistry(initial?)` — 중복 ID를 거부하고 structure/verification registry를 만든다.
- `resolveAdapters(projectRoot, adapters, paths?)` — active claims, path ownership, unsupported paths와 diagnostics를 반환한다.
- `AdapterRegistry.registerStructure` / `registerVerification` — ID별 adapter 등록.
- `AdapterRegistry.resolveStructure` / `resolveVerification` — detect confidence가 양수인 adapter를 confidence 내림차순으로 반환.
- `StructureAdapter`는 source discovery, entry point inspection, dependency extraction, framework peer 판정과 entry point 제안을 제공한다.
- `VerificationAdapter`는 verification file discovery, role, semantic case count와 DETAIL contract group marker를 제공한다.

## Acceptance Criteria

### AC-adapter-resolution — claim arbitration

- 단일 최고 confidence owner는 선택되고 evidence가 보존된다.
- 동률 owner는 `ambiguous-adapter-claim`, 무소유 path는 `unsupported`다.

### AC-adapter-extension — core 비변경

- 가짜 새 adapter를 등록하고 해석하는 테스트가 core/policy/MCP 변경 없이 통과한다.

### AC-adapter-portability — 설치 독립성

- adapter registry와 초기 adapter는 native addon, global npm lookup과 glob dependency 없이 동작한다.

## Last Updated

2026-07-26 — Filid 1.0 adapter registry와 claim arbitration 계약을 정의했다.
