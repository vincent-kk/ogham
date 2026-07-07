import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { SUPPORTED_LANGUAGES } from '../../ast/astGrepShared/astGrepShared.js';
import { McpToolName } from '../../constants/mcpToolNames.js';
import { VERSION } from '../../version.js';
import { handleAstAnalyze } from '../tools/astAnalyze/astAnalyze.js';
import { handleAstGrepReplace } from '../tools/astGrepReplace/astGrepReplace.js';
import { handleAstGrepSearch } from '../tools/astGrepSearch/astGrepSearch.js';
import { handleCacheManage } from '../tools/cacheManage/cacheManage.js';
import { handleConfigPatchValidate } from '../tools/configPatchValidate/configPatchValidate.js';
import { handleCoverageVerify } from '../tools/coverageVerify/coverageVerify.js';
import { handleDebtManage } from '../tools/debtManage/debtManage.js';
import { handleDocCompress } from '../tools/docCompress/docCompress.js';
import { handleDriftDetect } from '../tools/driftDetect/driftDetect.js';
import { handleFractalNavigate } from '../tools/fractalNavigate/fractalNavigate.js';
import { handleFractalScan } from '../tools/fractalScan/fractalScan.js';
import { handleLcaResolve } from '../tools/lcaResolve/lcaResolve.js';
import { handleProjectInit } from '../tools/projectInit/projectInit.js';
import { handleReviewManage } from '../tools/reviewManage/reviewManage.js';
import { handleRuleDocsSync } from '../tools/ruleDocsSync/ruleDocsSync.js';
import { handleRuleQuery } from '../tools/ruleQuery/ruleQuery.js';
import { handleStructureValidate } from '../tools/structureValidate/structureValidate.js';
import { handleTestMetrics } from '../tools/testMetrics/testMetrics.js';

import { wrapHandler } from './serverHelpers.js';

/**
 * Create and configure the FCA-AI MCP server.
 */
export function createServer(): McpServer {
  const server = new McpServer({ name: 'filid', version: VERSION });

  server.registerTool(
    McpToolName.AST_ANALYZE,
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
    McpToolName.FRACTAL_NAVIGATE,
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
    McpToolName.DOC_COMPRESS,
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
    McpToolName.TEST_METRICS,
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
    McpToolName.PROJECT_INIT,
    {
      description:
        'Initialize FCA-AI project config only (.filid/config.json). Rule doc deployment is handled separately by rule_docs_sync via the setup skill.',
      inputSchema: z.object({
        path: z.string(),
        language: z
          .string()
          .optional()
          .describe(
            "Output language name for FCA-AI generated content (e.g. 'Korean'). Omit for English.",
          ),
      }),
    },
    wrapHandler(handleProjectInit),
  );

  server.registerTool(
    McpToolName.RULE_DOCS_SYNC,
    {
      description:
        'Filid-setup skill only: inspect or synchronise `.claude/rules/*.md` deployment against the user selection. Actions: status | sync | manifest.',
      inputSchema: z.object({
        action: z.enum(['status', 'sync', 'manifest']),
        path: z.string(),
        // `.nullish()` accepts `undefined` OR `null`. Some LLM callers
        // spuriously emit `selections: null` when the field is absent;
        // without `nullish` the generated JSON Schema rejects that shape
        // and the call fails with "Invalid tool parameters".
        selections: z
          .union([z.record(z.string(), z.boolean()), z.string()])
          .nullish(),
        // Rule ids whose drifted deployed files should be overwritten with
        // the current template. Accepts a string array, a JSON-encoded
        // string array, or null/undefined for none. Ignored for required
        // rules — they auto-resync on drift.
        resync: z.union([z.array(z.string()), z.string()]).nullish(),
      }),
    },
    wrapHandler(handleRuleDocsSync),
  );

  server.registerTool(
    McpToolName.FRACTAL_SCAN,
    {
      description:
        'Scan project directory to build FractalTree. outputMode: full (ScanReportDto), summary (counts only), paths (path/type/INTENT flags per node). Oversized results are saved to a report file and returned as { truncated, reportPath, summary } — Read/grep the file for details.',
      inputSchema: z.object({
        path: z.string(),
        depth: z.number().min(1).max(20).optional(),
        includeModuleInfo: z.boolean().optional(),
        outputMode: z.enum(['full', 'summary', 'paths']).optional(),
      }),
    },
    wrapHandler(handleFractalScan),
  );

  server.registerTool(
    McpToolName.DRIFT_DETECT,
    {
      description: 'Detect structural drift between project and FCA-AI rules.',
      inputSchema: z.object({
        path: z.string(),
        severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
        generatePlan: z.boolean().optional(),
      }),
    },
    wrapHandler(handleDriftDetect),
  );

  server.registerTool(
    McpToolName.LCA_RESOLVE,
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
    McpToolName.RULE_QUERY,
    {
      description: 'Query or check compliance of FCA-AI structure rules.',
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
    McpToolName.STRUCTURE_VALIDATE,
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
    McpToolName.REVIEW_MANAGE,
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
        hasDocumentChanges: z.boolean().optional(),
        adjudicatorMode: z.boolean().optional(),
      }),
    },
    wrapHandler(handleReviewManage),
  );

  server.registerTool(
    McpToolName.DEBT_MANAGE,
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
    McpToolName.CACHE_MANAGE,
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
    McpToolName.AST_GREP_SEARCH,
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
    McpToolName.AST_GREP_REPLACE,
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
    McpToolName.CONFIG_PATCH_VALIDATE,
    {
      description:
        'Validate a prospective .filid/config.json patch against FilidConfigSchema. Returns { valid, errors[], suggestion? } — errors[] is non-empty when the patch breaks strict schema; suggestion is a sanitised JSON string that would pass. Use this before emitting any .filid/config.json code patch in Phase D (review Step D.6.4).',
      inputSchema: z.object({
        patch_json: z.string(),
        source_context: z.string().optional(),
      }),
    },
    wrapHandler(handleConfigPatchValidate),
  );

  server.registerTool(
    McpToolName.COVERAGE_VERIFY,
    {
      description: 'Verify per-consumer test coverage for a shared module.',
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
