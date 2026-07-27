# src — Filid 1.0 source

## Purpose

Filid 1.0의 canonical TypeScript source. 생태계 어댑터가 사실을 수집하고, 언어 중립 core가 FCA 결과를 만들며, MCP와 훅이 host 경계를 담당한다.

## Structure

| Path         | Role                                                       |
| ------------ | ---------------------------------------------------------- |
| `adapters/`  | 생태계 탐지·구조·verification 증거 수집                    |
| `core/`      | 문서, snapshot, tree, policy, context, placement, artifact |
| `mcp/`       | 9개 도구와 settings page의 host boundary                   |
| `hooks/`     | INTENT/DETAIL write gate와 최소 context delivery           |
| `types/`     | 언어 중립 public DTO organ                                 |
| `constants/` | FCA rule·verification 상수 organ                           |
| `lib/`       | 작은 runtime utility organ                                 |

## Conventions

- ESM import와 명시적 named export를 사용한다.
- 공개 MCP handler 9개는 모두 공통 `ToolPayload` adapter 의미를 가진다.
- entry point는 MCP와 hook build entry다. `src/index.ts`는 npm library entry가 아니다.
- core/policy/DTO에 확장자, 진입점 이름, 테스트 호출 문법을 두지 않는다.

## Boundaries

### Always do

- 새 fractal에 INTENT.md, DETAIL.md와 named-export entry point 추가
- 어댑터 증거의 unsupported/indeterminate를 PASS와 구분

### Ask first

- 새 core 책임 또는 MCP 도구 추가
- 어댑터 공통 계약과 공개 DTO 변경

### Never do

- 특정 생태계 리터럴을 adapters 밖으로 유출
- core에서 프로젝트 파일 이동·import rewrite 실행
- 생성 버전 파일 또는 build output 손편집

## Dependencies

- Node.js ≥20, TypeScript, MCP SDK, Zod와 Ogham 공통 runtime packages
