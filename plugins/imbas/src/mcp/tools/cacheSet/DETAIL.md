# cacheSet — Contract

## Requirements

- MCP 도구 `cache_set` 의 핸들러다. 등록은 `mcp/server` 가 `wrapHandler` 로 감싸므로, 여기서 던진 예외는 MCP `isError: true` 응답이 된다.
- 프로젝트 루트는 `projectRoot(input.project_root)` 로 해석하고, 기록 위치는 `getCacheDir` 이 조립하는 `<root>/.imbas/<segment>/cache` 뿐이다.
- `data` 는 MCP 경계에서 optional 이지만 계약상 필수다. 스키마가 타입을 규정할 수 없어 optional 로 열어 둔 자리이므로, 누락 검사는 핸들러가 첫 단계에서 수행한다.
- 쓰기와 타임스탬프 갱신은 `cacheManager` 의 `saveCache` 가 소유한다 — 파일명 매핑과 `cached_at.json` 유지를 여기서 다시 구현하지 않는다.
- 캐시 값은 스키마로 검증하지 않는다. 타입마다 형태가 달라 `z.unknown()` 으로 통과시키며, 해석은 읽는 쪽(`cache_get` 소비자)의 몫이다.

## API Contracts

```typescript
export function handleCacheSet(input: CacheSetInput): Promise<{
  path: string;
  cached_at: string;
}>;

interface CacheSetInput {
  project_ref: string;
  cache_type: CacheType;
  data?: unknown; // 계약상 필수 — 누락 시 throw
  project_root?: string;
}
```

- MCP `inputSchema` 는 `{ project_ref: string, cache_type: CacheTypeSchema, data?: unknown, project_root?: string }` 다.
- 기록 대상은 `CACHE_FILE_MAP` 이 아는 네 타입(`project-meta`·`issue-types`·`link-types`·`workflows`)뿐이다. `CacheTypeSchema` 가 허용하는 `'all'` 은 읽기 전용 범위 지정자라 매핑이 없고, 전달하면 `Unknown cache type: all` 로 throw 한다.
- `saveCache` 는 캐시 파일을 원자적으로 쓴 뒤 `cached_at.json` 을 갱신하며, 기존 파일의 `ttl_hours` 를 보존한다. 읽을 수 없으면 `DEFAULT_CACHE_TTL_HOURS`(24)를 쓴다.
- `path` — `<cacheDir>/<cache_type>.json`. `cached_at` — 응답용으로 다시 만든 ISO 타임스탬프이므로, `cached_at.json` 에 기록된 값과 밀리초 단위로 다를 수 있다.
- 실패 — `data` 누락 시 `data is required`; 알 수 없는 `cache_type` 시 `Unknown cache type: <t>`; `project_ref` 가 단일 경로 세그먼트를 만들지 못하면 경로 조립 단계에서 throw.
- 배럴은 `handleCacheSet` 만 노출한다.

## Acceptance Criteria

### AC-data-required — data 누락 거부

- `data` 없이 호출하면 `data is required` 로 거부하고 어떤 파일도 쓰지 않는다.

### AC-ttl-preserved — TTL 보존

- 기존 `cached_at.json` 의 `ttl_hours` 는 저장 후에도 유지된다. 파일이 없으면 24가 기록된다.

### AC-write-then-read-back — 기록 후 재조회 일치

- 저장한 값은 같은 `project_ref`·`cache_type` 의 `cache_get` 으로 그대로 읽힌다.

### AC-all-is-not-writable — 'all' 은 쓰기 대상이 아님

- `cache_type: 'all'` 은 `Unknown cache type` 으로 거부된다 — 읽기 범위 지정자를 쓰기에 재사용하지 않는다.

## Last Updated

2026-07-30 — 캐시 기록 계약과 'all' 비대칭·TTL 보존 규약을 문서화했다.
