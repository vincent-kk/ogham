import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { SUPPORTED_LANGUAGES } from '../ast/ast-grep-shared.js';
import { VERSION } from '../version.js';

import { handleAstAnalyze } from './tools/ast-analyze.js';
import { handleAstGrepReplace } from './tools/ast-grep-replace.js';
import { handleAstGrepSearch } from './tools/ast-grep-search.js';
import { handleCacheManage } from './tools/cache-manage.js';
import { handleCoverageVerify } from './tools/coverage-verify.js';
import { handleDebtManage } from './tools/debt-manage.js';
import { handleDocCompress } from './tools/doc-compress.js';
import { handleDriftDetect } from './tools/drift-detect.js';
import { handleFractalNavigate } from './tools/fractal-navigate.js';
import { handleFractalScan } from './tools/fractal-scan.js';
import { handleLcaResolve } from './tools/lca-resolve.js';
import { handleProjectInit } from './tools/project-init.js';
import { handleReviewManage } from './tools/review-manage.js';
import { handleRuleQuery } from './tools/rule-query.js';
import { handleStructureValidate } from './tools/structure-validate.js';
import { handleTestMetrics } from './tools/test-metrics.js';

/** JSON.stringify replacer that converts Map/Set to plain objects/arrays */
function mapReplacer(_key: string, value: unknown): unknown {
  if (value instanceof Map) {
    return Object.fromEntries(value);
  }
  if (value instanceof Set) {
    return [...value];
  }
  return value;
}

function toolResult(result: unknown) {
  return {
    content: [
      { type: 'text' as const, text: JSON.stringify(result, mapReplacer, 2) },
    ],
  };
}

function toolError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: 'text' as const, text: `Error: ${message}` }],
    isError: true as const,
  };
}

/**
 * Wrap a tool handler with standard try/catch error handling.
 * Reduces repetitive boilerplate across all 16 registerTool callbacks.
 */
function wrapHandler<T>(
  fn: (args: T) => unknown | Promise<unknown>,
  options?: { checkErrorField?: boolean },
): (
  args: T,
) => Promise<
  | ReturnType<typeof toolResult>
  | ReturnType<typeof toolError>
  | { content: Array<{ type: 'text'; text: string }> }
> {
  return async (args: T) => {
    try {
      const result = await fn(args);
      if (
        options?.checkErrorField &&
        result &&
        typeof result === 'object' &&
        'error' in result
      ) {
        return {
          content: [
            {
              type: 'text' as const,
              text: String((result as { error: unknown }).error),
            },
          ],
        };
      }
      return toolResult(result);
    } catch (error) {
      return toolError(error);
    }
  };
}

/**
 * Create and configure the FCA-AI MCP server.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'filid', version: VERSION });

  server.registerTool(
    'ast_analyze',
    {
      description:
        'Analyze TypeScript/JavaScript source code AST. Extract dependencies, calculate LCOM4, cyclomatic complexity, or compute semantic diffs.',
      inputSchema: z.object({
        source: z.string().describe('Source code to analyze'),
        filePath: z.string().describe('Virtual file path').optional(),
        analysisType: z
          .enum([
            'dependency-graph',
            'lcom4',
            'cyclomatic-complexity',
            'tree-diff',
            'full',
          ])
          .describe('Type of analysis to perform'),
        className: z
          .string()
          .describe('Class name (required for lcom4)')
          .optional(),
        oldSource: z
          .string()
          .describe('Old source code (for tree-diff)')
          .optional(),
      }),
    },
    wrapHandler(handleAstAnalyze, { checkErrorField: true }),
  );

  server.registerTool(
    'fractal_navigate',
    {
      description:
        'Navigate the FCA-AI fractal tree structure. Classify directories as fractal/organ, list siblings, or build the full tree.',
      inputSchema: z.object({
        action: z
          .enum(['classify', 'sibling-list', 'tree'])
          .describe('Action to perform'),
        path: z.string().describe('Target path'),
        entries: z
          .array(
            z.object({
              name: z.string(),
              path: z.string(),
              type: z.enum([
                'fractal',
                'organ',
                'pure-function',
                'hybrid',
                'directory',
              ]),
              hasIntentMd: z.boolean(),
              hasDetailMd: z.boolean(),
              hasIndex: z.boolean().optional(),
              hasMain: z.boolean().optional(),
            }),
          )
          .describe('Directory/file entries for tree construction'),
      }),
    },
    // 'directory' in zod schema is resolved via classifyNode() inside the handler
    wrapHandler((args) =>
      handleFractalNavigate(
        args as Parameters<typeof handleFractalNavigate>[0],
      ),
    ),
  );

  server.registerTool(
    'doc_compress',
    {
      description:
        'Compress documents for context management. Supports reversible (file reference), lossy (tool call summary), or auto mode.',
      inputSchema: z.object({
        mode: z
          .enum(['reversible', 'lossy', 'auto'])
          .describe('Compression mode'),
        filePath: z.string().describe('File path (for reversible)').optional(),
        content: z
          .string()
          .describe('File content (for reversible)')
          .optional(),
        exports: z
          .array(z.string())
          .describe('Exported symbols (for reversible)')
          .optional(),
        toolCallEntries: z
          .array(
            z.object({
              tool: z.string(),
              path: z.string(),
              timestamp: z.string(),
            }),
          )
          .describe('Tool call entries (for lossy)')
          .optional(),
      }),
    },
    wrapHandler(handleDocCompress),
  );

  server.registerTool(
    'test_metrics',
    {
      description:
        'Analyze test metrics. Count test cases, check 3+12 rule violations, or run the decision tree for module actions.',
      inputSchema: z.object({
        action: z
          .enum(['count', 'check-312', 'decide'])
          .describe('Action to perform'),
        files: z
          .array(
            z.object({
              filePath: z.string(),
              content: z.string(),
            }),
          )
          .describe('Test files (for count/check-312)')
          .optional(),
        decisionInput: z
          .object({
            testCount: z.number(),
            lcom4: z.number(),
            cyclomaticComplexity: z.number(),
          })
          .describe('Decision parameters (for decide)')
          .optional(),
      }),
    },
    wrapHandler(handleTestMetrics),
  );

  server.registerTool(
    'project_init',
    {
      description:
        'Initialize FCA-AI project infrastructure. ' +
        'Creates .filid/config.json (rule configuration) and .claude/rules/fca.md (FCA architecture guide). ' +
        'Never overwrites existing files. Called during Phase 0 of the fca-init workflow.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the project root directory to initialize'),
      }),
    },
    wrapHandler(handleProjectInit),
  );

  server.registerTool(
    'fractal_scan',
    {
      description:
        'Scan a project directory to build a FractalTree and return a ScanReport. ' +
        'Classifies each directory node as fractal/organ/pure-function/hybrid. ' +
        'When includeModuleInfo=true, includes entry point (index.ts, main.ts) analysis for each module.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the project root directory to scan'),
        depth: z
          .number()
          .min(1)
          .max(20)
          .describe('Maximum directory scan depth. Default: 10')
          .optional(),
        includeModuleInfo: z
          .boolean()
          .describe('Include module entry point analysis. Default: false')
          .optional(),
      }),
    },
    wrapHandler(handleFractalScan),
  );

  server.registerTool(
    'drift_detect',
    {
      description:
        'Detect drift between the current project structure and filid fractal structure rules. ' +
        'Each drift item includes expected value, actual value, severity (critical/high/medium/low), ' +
        'and a suggested correction action (SyncAction). ' +
        'When generatePlan=true, also generates a SyncPlan to resolve the drift.',
      inputSchema: z.object({
        path: z
          .string()
          .describe('Absolute path to the project root directory to check for drift'),
        severity: z
          .enum(['critical', 'high', 'medium', 'low'])
          .describe(
            'Minimum severity filter. Only return drift items at or above this level. Omit to return all.',
          )
          .optional(),
        generatePlan: z
          .boolean()
          .describe('Whether to generate a SyncPlan for drift resolution. Default: false')
          .optional(),
      }),
    },
    wrapHandler(handleDriftDetect),
  );

  server.registerTool(
    'lca_resolve',
    {
      description:
        'Compute the Lowest Common Ancestor (LCA) of two modules in the fractal tree. ' +
        'Used to determine where to place a new shared dependency. ' +
        'Returns the distance from each module to the LCA and a suggestedPlacement path.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the project root directory'),
        moduleA: z
          .string()
          .describe(
            'Relative path of the first module from project root (e.g., src/features/auth)',
          ),
        moduleB: z
          .string()
          .describe(
            'Relative path of the second module from project root (e.g., src/features/payment)',
          ),
      }),
    },
    wrapHandler(handleLcaResolve),
  );

  server.registerTool(
    'rule_query',
    {
      description:
        'Query filid fractal structure rules or check rule compliance for a specific path. ' +
        "action='list': return all active rules. " +
        "action='get': return details for a specific rule. " +
        "action='check': evaluate rules against a target path.",
      inputSchema: z.object({
        action: z
          .enum(['list', 'get', 'check'])
          .describe("Action to perform: 'list' | 'get' | 'check'"),
        path: z.string().describe('Absolute path to the project root directory'),
        ruleId: z
          .string()
          .describe("Rule ID to retrieve (required for action='get')")
          .optional(),
        category: z
          .enum([
            'naming',
            'structure',
            'dependency',
            'documentation',
            'index',
            'module',
          ])
          .describe("Category filter (for action='list')")
          .optional(),
        targetPath: z
          .string()
          .describe(
            "Target path to check (relative to project root, required for action='check')",
          )
          .optional(),
      }),
    },
    wrapHandler(handleRuleQuery),
  );

  server.registerTool(
    'structure_validate',
    {
      description:
        'Validate fractal structure compliance for the entire project or a specific set of rules. ' +
        'Returns a list of violations with pass/fail/warning counts. ' +
        'When fix=true, auto-fixes safe-level violations and re-reports remaining ones.',
      inputSchema: z.object({
        path: z.string().describe('Absolute path to the project root directory to validate'),
        rules: z
          .array(z.string())
          .describe('List of rule IDs to check. Omit to check all active rules.')
          .optional(),
        fix: z
          .boolean()
          .describe(
            'Auto-fix safe-level violations. Default: false (not yet implemented — planned for future)',
          )
          .optional(),
      }),
    },
    wrapHandler(handleStructureValidate),
  );

  server.registerTool(
    'review_manage',
    {
      description:
        'Manage code review governance sessions. ' +
        "action='normalize-branch': convert branch name to filesystem-safe string. " +
        "action='ensure-dir': create review directory (.filid/review/<normalized>). " +
        "action='checkpoint': detect review progress phase (A/B/C/DONE). " +
        "action='elect-committee': elect review committee based on change complexity. " +
        "action='cleanup': delete review directory. " +
        "action='content-hash': compute and store content hash for changed files. " +
        "action='check-cache': compare against previous review cache to determine re-run necessity. " +
        "action='format-pr-comment': format review results as collapsible PR comment markdown. " +
        "action='format-revalidate-comment': format revalidation results as collapsible PR comment markdown. " +
        "action='generate-human-summary': parse review session files to generate a human PL-facing PR summary (HumanSummary). Top 5 items by error probability + auto-fixable items separated.",
      inputSchema: z.object({
        action: z
          .enum([
            'normalize-branch',
            'ensure-dir',
            'checkpoint',
            'elect-committee',
            'cleanup',
            'content-hash',
            'check-cache',
            'format-pr-comment',
            'format-revalidate-comment',
            'generate-human-summary',
          ])
          .describe('Action to perform'),
        projectRoot: z.string().describe('Absolute path to the project root directory'),
        branchName: z
          .string()
          .describe(
            'Branch name for normalize-branch / ensure-dir / checkpoint / cleanup / content-hash / check-cache actions',
          )
          .optional(),
        baseRef: z
          .string()
          .describe(
            'Base ref for content-hash / check-cache actions (e.g., main, origin/main)',
          )
          .optional(),
        changedFilesCount: z
          .number()
          .describe('Number of changed files for elect-committee action')
          .optional(),
        changedFractalsCount: z
          .number()
          .describe('Number of changed fractals for elect-committee action')
          .optional(),
        hasInterfaceChanges: z
          .boolean()
          .describe('Whether interface changes exist for elect-committee action')
          .optional(),
      }),
    },
    wrapHandler(handleReviewManage),
  );

  server.registerTool(
    'debt_manage',
    {
      description:
        'Manage technical debt items. ' +
        "action='create': create a new debt item as .filid/debt/<id>.md. " +
        "action='list': list debt items (filterable by fractalPath). " +
        "action='resolve': delete a debt item file (mark as resolved). " +
        "action='calculate-bias': recalculate weights based on changed fractal paths and compute bias level.",
      inputSchema: z.object({
        action: z
          .enum(['create', 'list', 'resolve', 'calculate-bias'])
          .describe('Action to perform'),
        projectRoot: z.string().describe('Absolute path to the project root directory'),
        debtItem: z
          .object({
            fractal_path: z.string(),
            file_path: z.string(),
            created_at: z.string(),
            review_branch: z.string(),
            original_fix_id: z.string(),
            severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
            rule_violated: z.string(),
            metric_value: z.string(),
            title: z.string(),
            original_request: z.string(),
            developer_justification: z.string(),
            refined_adr: z.string(),
          })
          .describe("Debt item to create (required for action='create')")
          .optional(),
        fractalPath: z
          .string()
          .describe("Fractal path filter (for action='list')")
          .optional(),
        debtId: z
          .string()
          .describe("Debt ID to resolve/delete (required for action='resolve')")
          .optional(),
        debts: z
          .array(
            z.object({
              id: z.string(),
              fractal_path: z.string(),
              file_path: z.string(),
              created_at: z.string(),
              review_branch: z.string(),
              original_fix_id: z.string(),
              severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
              weight: z.number(),
              touch_count: z.number(),
              last_review_commit: z.string().nullable(),
              rule_violated: z.string(),
              metric_value: z.string(),
              title: z.string(),
              original_request: z.string(),
              developer_justification: z.string(),
              refined_adr: z.string(),
            }),
          )
          .describe("Debt items to evaluate (required for action='calculate-bias')")
          .optional(),
        changedFractalPaths: z
          .array(z.string())
          .describe("Changed fractal paths (required for action='calculate-bias')")
          .optional(),
        currentCommitSha: z
          .string()
          .describe("Current commit SHA for idempotency guard (for action='calculate-bias')")
          .optional(),
      }),
    },
    wrapHandler(handleDebtManage),
  );

  server.registerTool(
    'cache_manage',
    {
      description:
        'Manage the filid incremental cache. ' +
        "action='compute-hash': compute a project fingerprint hash from source file paths and mtimes. " +
        "action='save-hash': persist a skill run hash to disk for incremental mode. " +
        "action='get-hash': retrieve the last saved run hash for a skill.",
      inputSchema: z.object({
        action: z
          .enum(['compute-hash', 'save-hash', 'get-hash'])
          .describe('Action to perform'),
        cwd: z.string().describe('Project root directory (absolute path)'),
        skillName: z
          .string()
          .describe('Skill identifier (required for save-hash and get-hash)')
          .optional(),
        hash: z
          .string()
          .describe('Hash value to store (required for save-hash)')
          .optional(),
      }),
    },
    wrapHandler(handleCacheManage),
  );

  // AST Grep tools — gracefully degrade if @ast-grep/napi is unavailable
  server.registerTool(
    'ast_grep_search',
    {
      description:
        'Search for code patterns using AST matching. More precise than text search.\n\n' +
        'Use meta-variables in patterns:\n' +
        '- $NAME - matches any single AST node (identifier, expression, etc.)\n' +
        '- $$$ARGS - matches multiple nodes (for function arguments, list items, etc.)\n\n' +
        'Examples:\n' +
        '- "function $NAME($$$ARGS)" - find all function declarations\n' +
        '- "console.log($MSG)" - find all console.log calls\n' +
        '- "if ($COND) { $$$BODY }" - find all if statements\n' +
        '- "$X === null" - find null equality checks\n' +
        '- "import $$$IMPORTS from \'$MODULE\'" - find imports',
      inputSchema: z.object({
        pattern: z
          .string()
          .describe('AST pattern with meta-variables ($VAR, $$$VARS)'),
        language: z.enum(SUPPORTED_LANGUAGES).describe('Programming language'),
        path: z
          .string()
          .optional()
          .describe('Directory or file to search (default: current directory)'),
        context: z
          .number()
          .int()
          .min(0)
          .max(10)
          .optional()
          .describe('Lines of context around matches (default: 2)'),
        max_results: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe('Maximum results to return (default: 20)'),
      }),
    },
    wrapHandler(handleAstGrepSearch, { checkErrorField: true }),
  );

  server.registerTool(
    'ast_grep_replace',
    {
      description:
        'Replace code patterns using AST matching. Preserves matched content via meta-variables.\n\n' +
        'Use meta-variables in both pattern and replacement:\n' +
        '- $NAME in pattern captures a node, use $NAME in replacement to insert it\n' +
        '- $$$ARGS captures multiple nodes\n\n' +
        'Examples:\n' +
        '- Pattern: "console.log($MSG)" → Replacement: "logger.info($MSG)"\n' +
        '- Pattern: "var $NAME = $VALUE" → Replacement: "const $NAME = $VALUE"\n\n' +
        'IMPORTANT: dry_run=true (default) only previews changes. Set dry_run=false to apply.',
      inputSchema: z.object({
        pattern: z.string().describe('Pattern to match'),
        replacement: z
          .string()
          .describe('Replacement pattern (use same meta-variables)'),
        language: z.enum(SUPPORTED_LANGUAGES).describe('Programming language'),
        path: z
          .string()
          .optional()
          .describe('Directory or file to search (default: current directory)'),
        dry_run: z
          .boolean()
          .optional()
          .describe("Preview only, don't apply changes (default: true)"),
      }),
    },
    wrapHandler(handleAstGrepReplace, { checkErrorField: true }),
  );

  server.registerTool(
    'coverage_verify',
    {
      description:
        'Verify per-consumer test coverage for a shared module. ' +
        'Finds all files in the fractal subtree that import the target module, ' +
        'and checks whether each consumer has a representative test. ' +
        'Returns coverage ratio and warnings for uncovered consumers.',
      inputSchema: z.object({
        projectRoot: z.string().describe('Absolute path to the project root directory'),
        targetPath: z
          .string()
          .describe(
            'Path of the shared module to track (absolute or relative to projectRoot)',
          ),
        subtreeRoot: z
          .string()
          .describe('Subtree root path to limit the search scope')
          .optional(),
        exportNames: z
          .array(z.string())
          .describe('Specific export names to track (default: all exports)')
          .optional(),
      }),
    },
    wrapHandler(handleCoverageVerify),
  );

  return server;
}

/** Start the MCP server with stdio transport */
export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
