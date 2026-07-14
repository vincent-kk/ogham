## Purpose

Claude 정본(플러그인 산출물·루트 마켓플레이스)을 **읽기 전용**으로 파싱해 어댑터 생성의 입력 사실(facts)로 정규화한다.

## Structure

| Path                           | Role                                                        |
| ------------------------------ | ----------------------------------------------------------- |
| `read/readPluginFacts.ts`      | 플러그인 디렉터리 → PluginFacts (manifest·mcp·hooks·skills) |
| `read/readMarketplaceFacts.ts` | 저장소 루트 → MarketplaceFacts (이름·플러그인 항목)         |

## Boundaries

### Always do

- 필수 필드(플러그인 name, 마켓플레이스 name/source) 부재 시 즉시 throw — 조용한 기본값 금지.

### Ask first

- facts 계약(`types/adapter.ts`) 확장 — adapters/lint 소비처 전체에 영향.

### Never do

- 디스크 쓰기 — 이 모듈은 읽기 전용이다.
- 호스트별 변환 — 변환은 `adapters/` 소관.
