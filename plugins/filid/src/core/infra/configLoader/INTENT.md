# configLoader -- .filid/config.json 로딩, 프로젝트 초기화

## Purpose

.filid/config.json 로딩, 프로젝트 초기화, 규칙 문서 동기화.

## Structure

```
configLoader/
  configLoader.ts      facade (loaders/ + utils/ 공개 재수출)
  index.ts              barrel (configLoader.ts 재수출)
  loaders/              organ — 함수별 단일-파일 로더
    configSchemas.ts (Zod SSoT), configTypes.ts, manifestTypes.ts (RuleDoc* 타입)
    loadConfig / writeConfig / createDefaultConfig / loadRuleOverrides
    validateConfigPatch / resolveLanguage / resolveMaxDepth / initProject
    loadRuleDocsManifest.ts
    syncRuleDocs.ts        공유 project rule manager 결과 호환 매핑
    getRuleDocsStatus.ts   공유 read-only 상태를 기존 UI 계약으로 매핑
    createFilidRuleManager / resolveFilidRuleTarget / loadManagedRuleDocuments
  utils/                organ — 공유 private 헬퍼
    resolveGitRoot.ts, resolvePluginRoot.ts
    formatIssuePath.ts, getAt.ts, deleteAt.ts, parseWithAllowlistWarn.ts
    exemptSanitize.ts, routePatternSanitize.ts
    computeFileSha256.ts / computeTextSha256.ts
```

## Boundaries

### Always do

- 변경 후 관련 테스트 업데이트
- 공개 API 시그니처 또는 `RuleDoc*` 타입 변경 시 `DETAIL.md`를 먼저 갱신할 것

### Ask first

- 공개 API 시그니처 변경

### Never do

- 모듈 경계 외부 로직 인라인
- loaders/ 또는 utils/ 내부에 INTENT.md 추가
