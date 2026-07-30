# cacheGet — Contract

## Requirements

- MCP 도구 `cache_get` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 프로젝트 루트는 `projectRoot(input.project_root)` 로 해석한다. 캐시 디렉터리는 `getCacheDir` 이 조립하는 `<root>/.imbas/<segment>/cache` 뿐이다.
- `project_ref` 생략은 정상 호출이다 — 설정의 `defaults.project_ref` 를 승계한다. 설정에도 없으면 그때 거부한다.
- 캐시 메타(`cached_at.json`)의 부재·손상은 실패가 아니다. 조회 자체는 성공하고 신선도만 "모름"이 아니라 "만료"로 보고한다 — 호출자가 갱신을 택하는 쪽이 안전하다.
- 읽기 전용이다. 캐시 파일을 만들거나 갱신하지 않는다(`readOnlyHint: true`).

## API Contracts

```typescript
export function handleCacheGet(input: CacheGetInput): Promise<{
  cache: unknown;
  cached_at: string | null;
  ttl_expired: boolean;
}>;

interface CacheGetInput {
  project_ref?: string; // 생략 시 defaults.project_ref
  cache_type?: CacheType; // 생략 시 'all'
  project_root?: string;
}
```

- MCP `inputSchema` 는 `{ project_ref?: string, cache_type?: CacheTypeSchema, project_root?: string }` 다. `CacheTypeSchema` 는 `project-meta | issue-types | link-types | workflows | all`.
- `cache` — `'all'` 이면 읽히는 캐시 파일만 키별로 모은 객체이고 없는 파일은 조용히 건너뛴다(빈 객체 가능). 특정 타입이면 그 파일의 내용이며, 파일이 없으면 `readJson` 이 throw 한다.
- `cached_at` — `cached_at.json` 의 `cached_at` 문자열. 파일이 없거나 스키마를 벗어나면 `null`.
- `ttl_expired` — `isCacheExpired` 결과. `cached_at.json` 이 없거나 읽히지 않으면 `true`.
- 실패 — `project_ref` 를 인자로도 설정으로도 얻지 못하면 `project_ref is required (or set defaults.project_ref in config)` 로 throw. `project_ref` 가 단일 경로 세그먼트를 만들지 못해도 경로 조립 단계에서 throw 한다.
- 배럴은 `handleCacheGet` 만 노출한다. `CacheGetInput` 은 재노출되지 않으며, 호출자 계약은 MCP `inputSchema` 다.

## Acceptance Criteria

### AC-project-ref-fallback — project_ref 승계

- `project_ref` 없이 호출하면 설정의 `defaults.project_ref` 로 조회한다.
- 설정에도 없으면 설정 키를 지목하는 문장으로 throw 한다.

### AC-cache-type-default — 기본 조회 범위

- `cache_type` 생략 시 `'all'` 로 동작해 존재하는 캐시 파일만 병합해 돌려준다 — 일부 파일이 없어도 실패하지 않는다.

### AC-missing-metadata-degrades — 메타 부재 시 degrade

- `cached_at.json` 이 없으면 `cached_at: null`, `ttl_expired: true` 로 응답한다 — 예외로 바뀌지 않는다.

## Last Updated

2026-07-30 — 캐시 조회 계약과 메타 부재 시 degrade 규약을 문서화했다.
