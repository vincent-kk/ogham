# filid-config-loader -- .filid/config.json 로딩, 프로젝트 초기화

## Purpose

.filid/config.json 로딩, 프로젝트 초기화, 규칙 문서 동기화.

## Structure

```
config-loader/
  config-loader.ts      facade (loaders/ 재수출)
  index.ts              barrel (config-loader.ts 재수출)
  loaders/              organ — 두 가지 로더 관심사
    filid-config.ts     config I/O + initProject
    rule-docs-manifest.ts  규칙 문서 sync (filid-setup 전용)
  utils/                organ — 공유 private 헬퍼
    resolve-git-root.ts
    resolve-plugin-root.ts
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
