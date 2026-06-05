# configLoader -- .filid/config.json 로딩, 프로젝트 초기화

## Purpose

.filid/config.json 로딩, 프로젝트 초기화, 규칙 문서 동기화.

## Structure

```
configLoader/
  configLoader.ts      facade (loaders/ + utils/ 공개 재수출)
  index.ts              barrel (configLoader.ts 재수출)
  loaders/              organ — 함수별 단일-파일 로더
    configSchemas.ts        Zod schema SSoT (RuleOverride/AllowedEntry/FilidConfig)
    configTypes.ts          Init/LoadConfig/ConfigPatch 결과 타입
    manifestTypes.ts        RuleDoc* 타입 묶음
    loadConfig.ts           loadConfig
    writeConfig.ts          writeConfig
    createDefaultConfig.ts createDefaultConfig
    loadRuleOverrides.ts   loadRuleOverrides
    validateConfigPatch.ts validateConfigPatch
    resolveLanguage.ts      resolveLanguage
    resolveMaxDepth.ts     resolveMaxDepth
    initProject.ts          initProject
    loadRuleDocsManifest.ts  loadRuleDocsManifest
    getRuleDocsStatus.ts  getRuleDocsStatus
    syncRuleDocs.ts        syncRuleDocs
  utils/                organ — 공유 private 헬퍼
    resolveGitRoot.ts, resolvePluginRoot.ts
    formatIssuePath.ts, getAt.ts, deleteAt.ts, parseWithAllowlistWarn.ts
    exemptSanitize.ts, routePatternSanitize.ts, writeFileAtomically.ts, computeFileSha256.ts
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
