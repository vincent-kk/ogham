# core Specification

## Requirements

- 프랙탈 트리를 파일시스템에서 스캔하여 구축할 수 있어야 한다
- 노드를 fractal/organ/pure-function으로 구조 기반 분류해야 한다
- 8개 내장 규칙(naming, structure, dependency, documentation, index, module)을 평가할 수 있어야 한다
- 현재 구조와 기대 구조 사이의 드리프트를 감지하고 SyncPlan을 생성해야 한다
- INTENT.md/DETAIL.md의 50줄 제한과 3-tier 경계 섹션을 검증해야 한다
- 두 모듈의 Lowest Common Ancestor(LCA)를 계산해야 한다
- 프로젝트 건강도 점수와 리포트를 생성해야 한다
- 스킬 실행 해시를 캐시 디렉토리에 저장·조회하고 프로젝트 변경 해시를 계산해야 한다

## API Contracts

- `buildFractalTree(entries: NodeEntry[]): FractalTree` — 노드 배열로 트리 구축; 빈 배열이면 빈 트리 반환
- `scanProject(rootPath: string, options?: ScanOptions): Promise<FractalTree>` — 디렉토리 스캔 + 트리 구축
- `classifyNode(input: ClassifyInput): CategoryType` — 구조 기반 분류; 우선순위: hasIntentMd > hasDetailMd > isLeafDirectory > hasSideEffects > default
- `detectDrift(current: FractalTree, expected: FractalTree): DriftResult` — 이격 항목 목록 반환
- `evaluateRules(tree: FractalTree, rules: Rule[]): RuleViolation[]` — 규칙 위반 목록 반환
- `validateIntentMd(content: string): ValidationResult` — 50줄 초과 또는 3-tier 누락 시 오류
- `findLCA(tree: FractalTree, pathA: string, pathB: string): FractalNode | null` — LCA 없으면 null
- `buildDAG(tree: FractalTree): DAG` — 의존성 DAG; 사이클 존재 시 `detectCycles`로 확인
- `saveRunHash(cwd, skillName, hash): void` — `run-{skillName}.hash` 파일에 저장; I/O 실패 시 무시
- `getLastRunHash(cwd, skillName): string | null` — 저장된 해시 반환; 없으면 null
- `computeProjectHash(cwd): Promise<string>` — `**/*.{ts,tsx,js,jsx,md}` 파일 경로+mtime 기반 16자 SHA256

- `resolveImportPath(source: string, fromFile: string): string | null` — import 소스 문자열을 절대 경로로 변환; 해석 불가 시 null
- `findSubtreeUsages(rootPath: string, targetModule: string): Promise<UsageInfo[]>` — 서브트리 내 대상 모듈 사용처 목록 반환
- `checkTestCoverage(rootPath: string, modules: string[]): Promise<CoverageResult[]>` — 모듈별 테스트 존재 여부 검증; 각 결과에 covered 플래그 포함
- `generateHumanSummary(sessionData: ReviewSession): string` — 리뷰 세션 데이터를 인간 친화적 마크다운 요약으로 변환
- `ALLOWED_FRACTAL_ROOT_FILES: Set<string>` — fractal root에서 허용되는 파일명 집합 (상수)
- `FRAMEWORK_RESERVED_FILES: Record<string, string[]>` — 프레임워크별 예약 파일 목록 (상수)
- `FRAMEWORK_PACKAGES: Record<string, string>` — 패키지명 → 프레임워크 식별자 매핑 (상수)

## Last Updated

2026-03-17
