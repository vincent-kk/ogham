# filid-config-loader -- .filid/config.json 로딩, 프로젝트 초기화

## Purpose

.filid/config.json 로딩, 프로젝트 초기화, 규칙 문서 동기화.

## Structure

```
config-loader/
  config-loader.ts      facade (loaders/ + utils/ 공개 재수출)
  index.ts              barrel (config-loader.ts 재수출)
  loaders/              organ — 함수별 단일-파일 로더
    config-schemas.ts        Zod schema SSoT (RuleOverride/AllowedEntry/FilidConfig)
    config-types.ts          Init/LoadConfig/ConfigPatch 결과 타입
    manifest-types.ts        RuleDoc* 타입 묶음
    load-config.ts           loadConfig
    write-config.ts          writeConfig
    create-default-config.ts createDefaultConfig
    load-rule-overrides.ts   loadRuleOverrides
    validate-config-patch.ts validateConfigPatch
    resolve-language.ts      resolveLanguage
    resolve-max-depth.ts     resolveMaxDepth
    init-project.ts          initProject
    load-rule-docs-manifest.ts  loadRuleDocsManifest
    get-rule-docs-status.ts  getRuleDocsStatus
    sync-rule-docs.ts        syncRuleDocs
  utils/                organ — 공유 private 헬퍼
    resolve-git-root.ts, resolve-plugin-root.ts
    format-issue-path.ts, get-at.ts, delete-at.ts, parse-with-allowlist-warn.ts
    exempt-sanitize.ts, write-file-atomically.ts, compute-file-sha256.ts
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
