## Purpose

Claude 정본(플러그인 산출물·루트 마켓플레이스)을 **읽기 전용**으로 파싱해 어댑터 생성의 입력 사실(facts)로 정규화한다.

## Structure

| Path                           | Role                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| `read/readPluginFacts.ts`      | 플러그인 디렉터리 → PluginFacts (manifest·mcp·hooks·skills) |
| `read/readMarketplaceFacts.ts` | 저장소 루트 → MarketplaceFacts (이름·플러그인 항목)         |

## Conventions

- 선택적 아티팩트(`hooksFile`·`mcpServers`)는 `existsSync` 로 존재를 먼저 확인하고 없으면 `null` — 파일 부재는 에러가 아니라 정상 상태다.
- 필수 필드(name 등)만 `typeof` 로 검증해 throw 하고, `category` 같은 선택 필드는 기본값을 채우지 않은 채 원본 그대로 통과시킨다.
- `directory` 인자의 절대/상대 여부는 이 모듈이 정규화하지 않는다 — 호출자(CLI)가 이미 절대경로로 넘긴다고 가정하고 `join(directory, <경로 상수>)` 로만 조립한다.
- `hasSkills` 처럼 존재 여부만 필요한 아티팩트는 내용을 파싱하지 않고 boolean 으로만 기록한다.

## Boundaries

### Always do

- 필수 필드(플러그인 name, 마켓플레이스 name/source) 부재 시 즉시 throw — 조용한 기본값 금지.

### Ask first

- facts 계약(`types/facts.ts`) 확장 — adapters/lint 소비처 전체에 영향.

### Never do

- 디스크 쓰기 — 이 모듈은 읽기 전용이다.
- 호스트별 변환 — 변환은 `adapters/` 소관.

## Dependencies

- `constants/claudeArtifacts.ts` (아티팩트 경로 상수), `types/` (PluginFacts · MarketplaceFacts · HooksFileSource · McpServerSource), Node `fs`·`path` 만.
- 하류: `pipeline/steps/` 가 read 함수를 직접 호출하고, `adapters/builders/`·`lint/checks/` 는 산출 타입을 소비한다.
