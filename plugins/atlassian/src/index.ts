/**
 * @file index.ts
 * @description @ogham/atlassian public API entry point
 */

export { VERSION } from "./version.js";

// Types
export {
  AtlassianConfigSchema,
  AuthCheckConnectionStatusSchema,
  AuthCheckResultSchema,
  AuthCheckServiceEntrySchema,
  AuthCheckServiceStatusSchema,
  AuthCheckUserInfoSchema,
  BasicCredentialSchema,
  ConnectionInfoSchema,
  ConnectionTestResultSchema,
  ConvertDirectionSchema,
  ConvertFormatSchema,
  CredentialsSchema,
  DeploymentTypeSchema,
  HttpMethodSchema,
  HttpRequestSchema,
  HttpResponseSchema,
  McpErrorSchema,
  McpResponseSchema,
  PaginationSchema,
  ServiceConfigSchema,
  ServiceCredentialsSchema,
  SetupFormDataSchema,
  SetupResponseSchema,
  SetupStatusSchema,
  TokenPayloadSchema,
} from "./types/index.js";
export type {
  AssetFetchParams,
  AtlassianConfig,
  AuthCheckConnectionStatus,
  AuthCheckResult,
  AuthCheckServiceEntry,
  AuthCheckServiceStatus,
  AuthCheckUserInfo,
  ConnectionInfo,
  ConnectionTestResult,
  ConvertDirection,
  ConvertFormat,
  Credentials,
  DeploymentType,
  FetchContext,
  FetchParams,
  HttpClientConfig,
  HttpMethod,
  HttpRequest,
  HttpResponse,
  McpError,
  McpResponse,
  Pagination,
  RequestOptions,
  ServiceConfig,
  ServiceCredentials,
  SetupFormData,
  SetupParams,
  SetupResponse,
  SetupResult,
  SetupServerHandle,
  SetupStatus,
  TestConnectionParams,
  TokenPayload,
} from "./types/index.js";

// Constants
export {
  CLOUD_HOSTNAME_PATTERN,
  CONFIG_PATH,
  CONNECTION_TEST_TIMEOUT,
  CREDENTIALS_PATH,
  DEFAULT_SSL_VERIFY,
  DEFAULT_TIMEOUT,
  ERROR_CODE_MAP,
  PLUGIN_DATA_DIR,
  RETRY_BACKOFF_MULTIPLIER,
  RETRY_BASE_DELAY_MS,
  RETRY_MAX_DELAY_MS,
  RETRY_MAX_RETRIES,
  RETRYABLE_STATUS_CODES,
  SERVER_ERROR_CODE,
  STATE_PATH,
  TEMP_DIR_NAME,
} from "./constants/index.js";

// Core
export {
  configLayers,
  executeRequest,
  getApiVersion,
  getAuthHeader,
  loadConfig,
  loadConfigByScope,
  loadConfigScope,
  loadCredentials,
  mergeConfig,
  resolveEnvironment,
  saveConfig,
  saveCredentials,
  testConnection,
  validateUrl,
} from "./core/index.js";
export type { ConfigByScope, EnvironmentInfo } from "./core/index.js";

// Converter
export {
  adfToMarkdown,
  convert,
  markdownToAdf,
  markdownToStorage,
  markdownToWiki,
  storageToMarkdown,
} from "./converter/index.js";

// Utils
export {
  attachPrefix,
  buildAuthHeader,
  buildUrl,
  detectService,
  extractHostname,
  isPrivateIp,
  joinUrl,
  parseJiraUrl,
  resolveSiteConfig,
  stripBaseUrl,
  transformRequest,
  validateSavePath,
} from "./utils/index.js";
export type { JiraUrlParts } from "./utils/index.js";

// MCP 는 여기서 재노출하지 않는다. 실행 진입점은 esbuild 가 `mcp/serverEntry/` 로부터
// 만드는 `bridge/mcp-server.cjs` 이고, `mcp/server/server.ts` 가 `version.ts` 를 참조하므로
// 재노출하면 src → mcp → server → src 의존 순환이 된다.
