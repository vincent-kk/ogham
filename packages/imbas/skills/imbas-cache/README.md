# imbas-cache

Jira 프로젝트 메타데이터 캐시 관리 스킬 (내부 전용, 사용자 직접 호출 불가).

## 개요

Jira 프로젝트의 이슈 타입, 링크 타입, 워크플로우 등 메타데이터를 로컬에 캐싱하여
다른 스킬들(setup, validate, split, devplan)이 반복적으로 Jira API를 호출하지 않도록 한다.

## 동작 방식

- **ensure**: 캐시 유효성 확인 후, TTL(기본 24시간) 만료 시 자동 갱신
- **refresh**: 모든 캐시 타입 강제 갱신 (Atlassian API에서 재조회)
- **clear**: 특정 프로젝트의 캐시 파일 전체 삭제

## 캐시 구조

```
.imbas/<PROJECT-KEY>/cache/
├── project-meta.json     # 프로젝트 기본 정보 (이름, 키, URL, 리드, 타입)
├── issue-types.json      # 이슈 타입 및 필수 필드
├── link-types.json       # 이슈 링크 타입 (inward/outward)
├── workflows.json        # 워크플로우 상태 및 전이
└── cached_at.json        # 캐시 타임스탬프 및 TTL
```

## TTL 로직

- 기본 TTL: 24시간
- 만료 판정: `(현재시각 - cached_at) / 3600000 >= ttl_hours`
- 사용자 접근: `/imbas:imbas-setup show` 또는 `/imbas:imbas-setup refresh-cache`

## 사용 도구

| 도구 | 출처 | 용도 |
|------|------|------|
| `cache_get` | imbas MCP | 캐시 읽기 및 TTL 상태 확인 |
| `cache_set` | imbas MCP | 조회된 메타데이터를 캐시에 저장 |
| `getVisibleJiraProjects` | Atlassian MCP | 프로젝트 목록 조회 |
| `getJiraProjectIssueTypesMetadata` | Atlassian MCP | 이슈 타입 조회 |
| `getJiraIssueTypeMetaWithFields` | Atlassian MCP | 타입별 필수 필드 조회 |
| `getIssueLinkTypes` | Atlassian MCP | 이슈 링크 타입 조회 |

## 참고 파일

- `references/actions.md` — 액션 상세 정의
- `references/cache-structure.md` — 캐시 디렉토리 구조
- `references/ttl-logic.md` — TTL 만료 로직
- `references/errors.md` — 에러 처리
- `references/tools.md` — 사용 도구 상세
