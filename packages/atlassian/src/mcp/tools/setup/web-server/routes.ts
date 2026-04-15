import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SetupFormData, SetupStatus, ConnectionTestResult } from '../../../../types/index.js';
import { SetupFormDataSchema } from '../../../../types/index.js';
import type { AtlassianConfig, Credentials, ServiceCredentials } from '../../../../types/index.js';
import { resolveEnvironment } from '../../../../core/index.js';

export interface RouteContext {
  setupHtml: string;
  loadConfig: () => Promise<AtlassianConfig>;
  saveConfig: (config: AtlassianConfig) => Promise<void>;
  loadCredentials: () => Promise<Credentials>;
  saveCredentials: (credentials: Credentials) => Promise<void>;
  testConnection: (params: {
    base_url: string;
    credentials: ServiceCredentials;
    username?: string;
    service: 'jira' | 'confluence';
  }) => Promise<ConnectionTestResult>;
  resetTimer: () => void;
  closeServer: () => Promise<void>;
}

const MASK = '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';

function sendJson(res: ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function parseBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const text = Buffer.concat(chunks).toString('utf-8');
        resolve(text ? JSON.parse(text) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function buildCredentials(
  svc: SetupFormData['jira'],
): ServiceCredentials {
  if (!svc) return {};
  return { basic: { api_token: svc.api_token, password: svc.password } };
}

/** Restore masked values from existing credentials */
function restoreMaskedValues(
  svc: NonNullable<SetupFormData['jira']>,
  existing: ServiceCredentials | undefined,
): void {
  if (!existing) return;
  if (svc.api_token === MASK) svc.api_token = existing.basic?.api_token;
  if (svc.password === MASK) svc.password = existing.basic?.password;
}

function buildStatus(config: AtlassianConfig): SetupStatus {
  return {
    configured: !!(config.jira?.length || config.confluence?.length),
    jira: config.jira?.map((s) => ({
      base_url: s.base_url,
      is_cloud: s.is_cloud,
    })),
    confluence: config.confluence?.map((s) => ({
      base_url: s.base_url,
      is_cloud: s.is_cloud,
    })),
  };
}

async function handleGetRoot(ctx: RouteContext, res: ServerResponse): Promise<void> {
  const config = await ctx.loadConfig();
  const credentials = await ctx.loadCredentials();
  const status = buildStatus(config);

  // Add masked credential indicators for edit mode
  const jiraSites = config.jira ?? [];
  const confSites = config.confluence ?? [];
  const hasJira = jiraSites.length > 0;
  const hasConf = confSites.length > 0;

  const stateData = {
    ...status,
    ...(hasJira && credentials.jira ? {
      jira: jiraSites.map((s) => ({
        base_url: s.base_url,
        is_cloud: s.is_cloud,
        username: s.username,
        api_token: credentials.jira?.basic?.api_token ? true : undefined,
      })),
    } : {}),
    ...(hasConf && credentials.confluence ? {
      confluence: confSites.map((s) => ({
        base_url: s.base_url,
        is_cloud: s.is_cloud,
        username: s.username,
        api_token: credentials.confluence?.basic?.api_token ? true : undefined,
      })),
    } : {}),
    deployment_type: hasJira && hasConf && jiraSites[0]?.base_url !== confSites[0]?.base_url
      ? 'on_premise' : 'cloud',
  };

  const html = ctx.setupHtml.replace('__SETUP_STATE__', JSON.stringify(stateData));
  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  });
  res.end(html);
}

async function handleStatus(ctx: RouteContext, res: ServerResponse): Promise<void> {
  const config = await ctx.loadConfig();
  sendJson(res, 200, buildStatus(config));
}

async function handleTest(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const body = await parseBody(req);
  const parsed = SetupFormDataSchema.safeParse(body);
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const data = parsed.data;
  const results: ConnectionTestResult[] = [];

  if (data.jira) {
    const creds = buildCredentials(data.jira);
    results.push(await ctx.testConnection({
      base_url: data.jira.base_url,
      credentials: creds,
      username: data.jira.username,
      service: 'jira',
    }));
  }

  if (data.confluence) {
    const creds = buildCredentials(data.confluence);
    results.push(await ctx.testConnection({
      base_url: data.confluence.base_url,
      credentials: creds,
      username: data.confluence.username,
      service: 'confluence',
    }));
  }

  const allSuccess = results.every((r) => r.success);
  sendJson(res, 200, {
    success: allSuccess,
    message: allSuccess ? 'All connections successful' : 'Some connections failed',
    results,
  });
}

async function handleSubmit(
  ctx: RouteContext,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const rawBody = await parseBody(req) as Record<string, unknown>;
  const cloudSites = (rawBody.cloud_sites as string[] | undefined) ?? [];

  const parsed = SetupFormDataSchema.safeParse(rawBody);
  if (!parsed.success) {
    sendJson(res, 400, {
      success: false,
      message: 'Validation failed',
      errors: parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
    return;
  }

  const data = parsed.data;
  const existingCredentials = await ctx.loadCredentials();

  // Restore masked values from existing credentials
  if (data.jira) restoreMaskedValues(data.jira, existingCredentials.jira);
  if (data.confluence) restoreMaskedValues(data.confluence, existingCredentials.confluence);

  // Test connections before saving
  const testResults: ConnectionTestResult[] = [];

  if (data.jira) {
    const creds = buildCredentials(data.jira);
    testResults.push(await ctx.testConnection({
      base_url: data.jira.base_url,
      credentials: creds,
      username: data.jira.username,
      service: 'jira',
    }));
  }

  if (data.confluence && data.deployment_type === 'onprem') {
    const creds = buildCredentials(data.confluence);
    testResults.push(await ctx.testConnection({
      base_url: data.confluence.base_url,
      credentials: creds,
      username: data.confluence.username,
      service: 'confluence',
    }));
  }

  const allTestsPass = testResults.every((r) => r.success);
  if (!allTestsPass) {
    sendJson(res, 400, {
      success: false,
      message: 'Connection test failed — configuration not saved',
      results: testResults,
    });
    return;
  }

  // Build config and credentials as arrays
  const newConfig: AtlassianConfig = {};
  const newCredentials: Credentials = {};

  if (data.deployment_type === 'cloud' && data.jira) {
    // Cloud mode: create array entries from cloud_sites
    const urls = cloudSites.length > 0 ? cloudSites : [data.jira.base_url];
    const sites = urls.map((url) => {
      const env = resolveEnvironment(url);
      return {
        base_url: env.base_url,
        is_cloud: env.is_cloud,
        username: data.jira!.username,
        ssl_verify: data.jira!.ssl_verify ?? true,
        timeout: data.jira!.timeout ?? 30000,
      };
    });
    // Both jira and confluence share Cloud sites
    newConfig.jira = sites;
    newConfig.confluence = sites;
    newCredentials.jira = buildCredentials(data.jira);
    newCredentials.confluence = buildCredentials(data.jira);
  } else {
    // On-premise: separate jira/confluence with single entry each
    if (data.jira) {
      const env = resolveEnvironment(data.jira.base_url);
      newConfig.jira = [{
        base_url: env.base_url,
        is_cloud: env.is_cloud,
        username: data.jira.username,
        ssl_verify: data.jira.ssl_verify ?? true,
        timeout: data.jira.timeout ?? 30000,
      }];
      newCredentials.jira = buildCredentials(data.jira);
    }

    if (data.confluence) {
      const env = resolveEnvironment(data.confluence.base_url);
      newConfig.confluence = [{
        base_url: env.base_url,
        is_cloud: env.is_cloud,
        username: data.confluence.username,
        ssl_verify: data.confluence.ssl_verify ?? true,
        timeout: data.confluence.timeout ?? 30000,
      }];
      newCredentials.confluence = buildCredentials(data.confluence);
    }
  }

  await ctx.saveConfig(newConfig);
  await ctx.saveCredentials(newCredentials);

  sendJson(res, 200, {
    success: true,
    message: 'Configuration saved successfully',
  });

  // Close server after successful save
  void ctx.closeServer();
}

/** Create an HTTP request handler with the given route context */
export function createRouteHandler(
  ctx: RouteContext,
): (req: IncomingMessage, res: ServerResponse) => void {
  return (req: IncomingMessage, res: ServerResponse) => {
    ctx.resetTimer();

    // CORS headers for local dev
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
    const path = url.pathname;

    const handleError = (err: unknown): void => {
      const message = err instanceof Error ? err.message : 'Internal server error';
      sendJson(res, 500, { success: false, message });
    };

    if (path === '/' && req.method === 'GET') {
      handleGetRoot(ctx, res).catch(handleError);
    } else if (path === '/status' && req.method === 'GET') {
      handleStatus(ctx, res).catch(handleError);
    } else if (path === '/test' && req.method === 'POST') {
      handleTest(ctx, req, res).catch(handleError);
    } else if (path === '/submit' && req.method === 'POST') {
      handleSubmit(ctx, req, res).catch(handleError);
    } else {
      sendJson(res, 404, { success: false, message: 'Not found' });
    }
  };
}
