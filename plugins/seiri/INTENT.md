# seiri — 에이전트가 파악하기 좋은 코드를 위한 규칙

## Purpose

코드 작성 품질·리뷰 규율·개발 방법론 규칙을 현재 하니스의 프로젝트 규칙 채널로 배포하는 에이전트 플러그인. 특정 아키텍처에 종속되지 않고 단독 동작한다. **규칙 본문은 주입하지 않는다** — 배포 파일은 하니스가 세션마다 로드한다.

## Structure

정본과 배포 사본이 함께 커밋되어 트리만으로는 편집 지점을 알 수 없다. 규칙·TypeScript source가 정본이고 build 산출물과 host manifest는 배포 사본이므로 직접 고치지 않는다.

## Conventions

- 빌드: `clean → version:sync → rules → pages → compile → mcp → hooks → compile-plugin`
- 규모 목표: MCP 도구 ≤2 · 훅 번들 5 · 에이전트 0 · 스킬 `SKILL.md` 각 ≤4KB(부속 reference 문서는 별도) · 규칙 각 <200줄. `src/__tests__/size.test.ts` 가 기계 검사한다.
- `templates/rules/*.md` 는 raw 바이트로 해시된다 — 루트 `.gitattributes`(LF 고정)와 루트 `.prettierignore`(포매터 차단)가 그 전제를 지킨다.

## Boundaries

### Always do

- 빌드 후 `bridge/`·`public/` 커밋 (`package.json:files` 포함).
- 규칙 변경은 host target·revision 기반 `plan` 으로 먼저 보여줄 수 있게 유지.

### Ask first

- 새 규칙 추가 (무지침 대조군 micro-test 통과가 선행 조건).
- MCP 도구·훅 추가 (상시 컨텍스트 비용 증가).

### Never do

- 아키텍처 강제(filid) · 에이전트 오케스트레이션 · 작업 분해(imbas) · 지식 관리(maencof) · 알림 · 상태 표시 — **역할 밖**.
- 저장소의 진실(검증 명령·프로젝트별 임계치) 보유 — 저장소가 소유한다. `seiri_function-boundaries` 의 보조 함수 본문 8줄 상한과 `seiri_code-comments` 의 인라인 주석 3줄 상한만 보편적 가독성 기본값으로 둔다.
- 차단 훅 도입 · 규칙 본문 주입 · 확인 없는 규칙 파일 쓰기.
