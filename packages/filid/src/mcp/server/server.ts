import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import { SUPPORTED_LANGUAGES } from '../../ast/ast-grep-shared/ast-grep-shared.js';
import { VERSION } from '../../version.js';

import { handleAstAnalyze } from '../tools/ast-analyze/ast-analyze.js';
import { handleAstGrepReplace } from '../tools/ast-grep-replace/ast-grep-replace.js';
import { handleAstGrepSearch } from '../tools/ast-grep-search/ast-grep-search.js';
import { handleCacheManage } from '../tools/cache-manage/cache-manage.js';
import { handleCoverageVerify } from '../tools/coverage-verify/coverage-verify.js';
import { handleDebtManage } from '../tools/debt-manage/debt-manage.js';
import { handleDocCompress } from '../tools/doc-compress/doc-compress.js';
import { handleDriftDetect } from '../tools/drift-detect/drift-detect.js';
import { handleFractalNavigate } from '../tools/fractal-navigate/fractal-navigate.js';
import { handleFractalScan } from '../tools/fractal-scan/fractal-scan.js';
import { handleLcaResolve } from '../tools/lca-resolve/lca-resolve.js';
import { handleProjectInit } from '../tools/project-init/project-init.js';
import { handleReviewManage } from '../tools/review-manage/review-manage.js';
import { handleRuleQuery } from '../tools/rule-query/rule-query.js';
import { handleStructureValidate } from '../tools/structure-validate/structure-validate.js';
import { handleTestMetrics } from '../tools/test-metrics/test-metrics.js';

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
        'Analyze source code AST: dependencies, LCOM4, cyclomatic complexity, or semantic diff.',
      inputSchema: z.object({
        source: z.string(),
        filePath: z.string().optional(),
        analysisType: z.enum([
          'dependency-graph',
          'lcom4',
          'cyclomatic-complexity',
          'tree-diff',
          'full',
        ]),
        className: z.string().optional(),
        oldSource: z.string().optional(),
      }),
    },
    wrapHandler(handleAstAnalyze, { checkErrorField: true }),
  );

  server.registerTool(
    'fractal_navigate',
    {
      description:
        'Navigate the FCA-AI fractal tree: classify, sibling-list, or full tree.',
      inputSchema: z.object({
        action: z.enum(['classify', 'sibling-list', 'tree']),
        path: z.string(),
        entries: z.array(
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
        ),
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
        'Compress documents for context management via reversible, lossy, or auto mode.',
      inputSchema: z.object({
        mode: z.enum(['reversible', 'lossy', 'auto']),
        filePath: z.string().optional(),
        content: z.string().optional(),
        exports: z.array(z.string()).optional(),
        toolCallEntries: z
          .array(
            z.object({
              tool: z.string(),
              path: z.string(),
              timestamp: z.string(),
            }),
          )
          .optional(),
      }),
    },
    wrapHandler(handleDocCompress),
  );

  server.registerTool(
    'test_metrics',
    {
      description:
        'Analyze test metrics: count cases, check 3+12 rule, or run decision tree.',
      inputSchema: z.object({
        action: z.enum(['count', 'check-312', 'decide']),
        files: z
          .array(z.object({ filePath: z.string(), content: z.string() }))
          .optional(),
        decisionInput: z
          .object({
            testCount: z.number(),
            lcom4: z.number(),
            cyclomaticComplexity: z.number(),
          })
          .optional(),
      }),
    },
    wrapHandler(handleTestMetrics),
  );

  server.registerTool(
    'project_init',
    {
      description:
        'Initialize FCA-AI project with .filid/config.json and .claude/rules/fca.md.',
      inputSchema: z.object({
        path: z.string(),
      }),
    },
    wrapHandler(handleProjectInit),
  );

  server.registerTool(
    'fractal_scan',
    {
      description:
        'Scan project directory to build FractalTree and return ScanReport.',
      inputSchema: z.object({
        path: z.string(),
        depth: z.number().min(1).max(20).optional(),
        includeModuleInfo: z.boolean().optional(),
      }),
    },
    wrapHandler(handleFractalScan),
  );

  server.registerTool(
    'drift_detect',
    {
      description:
        'Detect structural drift between project and FCA-AI rules.',
      inputSchema: z.object({
        path: z.string(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        generatePlan: z.boolean().optional(),
      }),
    },
    wrapHandler(handleDriftDetect),
  );

  server.registerTool(
    'lca_resolve',
    {
      description:
        'Compute Lowest Common Ancestor of two modules in the fractal tree.',
      inputSchema: z.object({
        path: z.string(),
        moduleA: z.string(),
        moduleB: z.string(),
      }),
    },
    wrapHandler(handleLcaResolve),
  );

  server.registerTool(
    'rule_query',
    {
      description:
        'Query or check compliance of FCA-AI structure rules.',
      inputSchema: z.object({
        action: z.enum(['list', 'get', 'check']),
        path: z.string(),
        ruleId: z.string().optional(),
        category: z
          .enum([
            'naming',
            'structure',
            'dependency',
            'documentation',
            'index',
            'module',
          ])
          .optional(),
        targetPath: z.string().optional(),
      }),
    },
    wrapHandler(handleRuleQuery),
  );

  server.registerTool(
    'structure_validate',
    {
      description:
        'Validate fractal structure compliance and return violations (read-only; auto-fix not supported).',
      inputSchema: z.object({
        path: z.string(),
        rules: z.array(z.string()).optional(),
      }),
    },
    wrapHandler(handleStructureValidate),
  );

  server.registerTool(
    'review_manage',
    {
      description: 'Manage code review governance sessions.',
      inputSchema: z.object({
        action: z.enum([
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
        ]),
        projectRoot: z.string(),
        branchName: z.string().optional(),
        baseRef: z.string().optional(),
        changedFilesCount: z.number().optional(),
        changedFractalsCount: z.number().optional(),
        hasInterfaceChanges: z.boolean().optional(),
      }),
    },
    wrapHandler(handleReviewManage),
  );

  server.registerTool(
    'debt_manage',
    {
      description:
        'Manage technical debt items: create, list, resolve, or calculate bias.',
      inputSchema: z.object({
        action: z.enum(['create', 'list', 'resolve', 'calculate-bias']),
        projectRoot: z.string(),
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
          .optional(),
        fractalPath: z.string().optional(),
        debtId: z.string().optional(),
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
          .optional(),
        changedFractalPaths: z.array(z.string()).optional(),
        currentCommitSha: z.string().optional(),
      }),
    },
    wrapHandler(handleDebtManage),
  );

  server.registerTool(
    'cache_manage',
    {
      description:
        'Manage filid incremental cache: compute, save, or retrieve hashes.',
      inputSchema: z.object({
        action: z.enum(['compute-hash', 'save-hash', 'get-hash']),
        cwd: z.string(),
        skillName: z.string().optional(),
        hash: z.string().optional(),
      }),
    },
    wrapHandler(handleCacheManage),
  );

  // AST Grep tools — gracefully degrade if @ast-grep/napi is unavailable
  server.registerTool(
    'ast_grep_search',
    {
      description:
        'Search for code patterns using AST matching with meta-variables.',
      inputSchema: z.object({
        pattern: z.string(),
        language: z.enum(SUPPORTED_LANGUAGES),
        path: z.string().optional(),
        context: z.number().int().min(0).max(10).optional(),
        max_results: z.number().int().min(1).max(100).optional(),
      }),
    },
    wrapHandler(handleAstGrepSearch, { checkErrorField: true }),
  );

  server.registerTool(
    'ast_grep_replace',
    {
      description:
        'Replace code patterns using AST matching. dry_run=true by default.',
      inputSchema: z.object({
        pattern: z.string(),
        replacement: z.string(),
        language: z.enum(SUPPORTED_LANGUAGES),
        path: z.string().optional(),
        dry_run: z.boolean().optional(),
      }),
    },
    wrapHandler(handleAstGrepReplace, { checkErrorField: true }),
  );

  server.registerTool(
    'coverage_verify',
    {
      description:
        'Verify per-consumer test coverage for a shared module.',
      inputSchema: z.object({
        projectRoot: z.string(),
        targetPath: z.string(),
        subtreeRoot: z.string().optional(),
        exportNames: z.array(z.string()).optional(),
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
