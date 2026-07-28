# CLAUDE.md — @ogham/maencof-lens

현재 계약은 [INTENT.md](./INTENT.md), 소스 경계는 [src/INTENT.md](./src/INTENT.md), 설계 맥락은 [design-spec.md](../../.metadata/maencof-lens/design-spec.md)를 따른다.

## Context

- lens는 이미 인덱싱된 vault를 읽는 client다. `kg_build`나 mutation을 대신 수행하지 않는다.
- 읽기 도구는 `@ogham/maencof`의 기존 handler를 감싸고, vault 설정 상한과 호출별 layer filter의 교집합을 항상 적용한다.
- config root는 환경변수 다음 host workspace root 순으로 정한다. `process.cwd()`는 플러그인 설치 경로일 수 있으므로 fallback으로 쓰지 않는다.
