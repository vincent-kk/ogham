import type { IncomingMessage, ServerResponse } from 'node:http';
import type { SetupFormData, SetupStatus, ConnectionTestResult } from '../../../../types/index.js';
import { SetupFormDataSchema } from '../../../../types/index.js';
import type { AtlassianConfig, Credentials, AuthType, ServiceCredentials } from '../../../../types/index.js';
import { resolveEnvironment } from '../../../../core/index.js';

export interface RouteContext {
  setupHtml: string;
  loadConfig: () => Promise<AtlassianConfig>;
  saveConfig: (config: AtlassianConfig) => Promise<void>;
  loadCredentials: () => Promise<Credentials>;
  saveCredentials: (credentials: Credentials) => Promise<void>;
  testConnection: (params: {
    base_url: string;
    auth_type: AuthType;
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
  authType: AuthType,
): ServiceCredentials {
  if (!svc) return {};
  switch (authType) {
    case 'basic':
      return { basic: { api_token: svc.api_token, password: svc.password } };
    case 'pat':
      return { pat: { personal_token: svc.personal_token! } };
    case 'oauth':
      return {
        oauth: {
          client_id: svc.client_id!,
          client_secret: svc.client_secret!,
          access_token: svc.access_token!,
          refresh_token: svc.refresh_token,
        },
      };
  }
}

/** Restore masked values from existing credentials */
function restoreMaskedValues(
  svc: NonNullable<SetupFormData['jira']>,
  existing: ServiceCredentials | undefined,
): void {
  if (!existing) return;
  if (svc.api_token === MASK) svc.api_token = existing.basic?.api_token;
  if (svc.password === MASK) svc.password = existing.basic?.password;
  if (svc.personal_token === MASK) svc.personal_token = existing.pat?.personal_token;
  if (svc.client_secret === MASK) svc.client_secret = existing.oauth?.client_secret;
  if (svc.access_token === MASK) svc.access_token = existing.oauth?.access_token;
  if (svc.refresh_token === MASK) svc.refresh_token = existing.oauth?.refresh_token;
}

function buildStatus(config: AtlassianConfig): SetupStatus {
  return {
    configured: !!(config.jira || config.confluence),
    jira: config.jira ? {
      base_url: config.jira.base_url,
      auth_type: config.jira.auth_type,
      is_cloud: config.jira.is_cloud,
    } : undefined,
    confluence: config.confluence ? {
      base_url: config.confluence.base_url,
      auth_type: config.confluence.auth_type,
      is_cloud: config.confluence.is_cloud,
    } : undefined,
  };
}

async function handleGetRoot(ctx: RouteContext, res: ServerResponse): Promise<void> {
  const config = await ctx.loadConfig();
  const credentials = await ctx.loadCredentials();
  const status = buildStatus(config);

  // Add masked credential indicators for edit mode
  const stateData = {
    ...status,
    ...(config.jira && credentials.jira ? {
      jira: {
        ...status.jira,
        username: config.jira.username,
        api_token: credentials.jira?.basic?.api_token ? true : undefined,
        personal_token: credentials.jira?.pat?.personal_token ? true : undefined,
        client_id: credentials.jira?.oauth?.client_id,
        client_secret: credentials.jira?.oauth?.client_secret ? true : undefined,
        access_token: credentials.jira?.oauth?.access_token ? true : undefined,
        refresh_token: credentials.jira?.oauth?.refresh_token ? true : undefined,
      },
    } : {}),
    ...(config.confluence && credentials.confluence ? {
      confluence: {
        ...status.confluence,
        username: config.confluence.username,
        api_token: credentials.confluence?.basic?.api_token ? true : undefined,
        personal_token: credentials.confluence?.pat?.personal_token ? true : undefined,
        client_id: credentials.confluence?.oauth?.client_id,
        client_secret: credentials.confluence?.oauth?.client_secret ? true : undefined,
        access_token: credentials.confluence?.oauth?.access_token ? true : undefined,
        refresh_token: credentials.confluence?.oauth?.refresh_token ? true : undefined,
      },
    } : {}),
    deployment_type: config.jira && config.confluence ? 'on_premise' : 'cloud',
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
    const creds = buildCredentials(data.jira, data.jira.auth_type);
    results.push(await ctx.testConnection({
      base_url: data.jira.base_url,
      auth_type: data.jira.auth_type,
      credentials: creds,
      username: data.jira.username,
      service: 'jira',
    }));
  }

  if (data.confluence) {
    const creds = buildCredentials(data.confluence, data.confluence.auth_type);
    results.push(await ctx.testConnection({
      base_url: data.confluence.base_url,
      auth_type: data.confluence.auth_type,
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
  const existingCredentials = await ctx.loadCredentials();

  // Restore masked values from existing credentials
  if (data.jira) restoreMaskedValues(data.jira, existingCredentials.jira);
  if (data.confluence) restoreMaskedValues(data.confluence, existingCredentials.confluence);

  // Test connections before saving
  const testResults: ConnectionTestResult[] = [];

  if (data.jira) {
    const creds = buildCredentials(data.jira, data.jira.auth_type);
    testResults.push(await ctx.testConnection({
      base_url: data.jira.base_url,
      auth_type: data.jira.auth_type,
      credentials: creds,
      username: data.jira.username,
      service: 'jira',
    }));
  }

  if (data.confluence) {
    const creds = buildCredentials(data.confluence, data.confluence.auth_type);
    testResults.push(await ctx.testConnection({
      base_url: data.confluence.base_url,
      auth_type: data.confluence.auth_type,
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

  // Build config and credentials
  const newConfig: AtlassianConfig = {};
  const newCredentials: Credentials = {};

  if (data.jira) {
    const env = resolveEnvironment(data.jira.base_url);
    newConfig.jira = {
      base_url: env.base_url,
      auth_type: data.jira.auth_type,
      is_cloud: env.is_cloud,
      username: data.jira.username,
      ssl_verify: data.jira.ssl_verify ?? true,
      timeout: data.jira.timeout ?? 30000,
    };
    newCredentials.jira = buildCredentials(data.jira, data.jira.auth_type);
  }

  if (data.confluence) {
    const env = resolveEnvironment(data.confluence.base_url);
    newConfig.confluence = {
      base_url: env.base_url,
      auth_type: data.confluence.auth_type,
      is_cloud: env.is_cloud,
      username: data.confluence.username,
      ssl_verify: data.confluence.ssl_verify ?? true,
      timeout: data.confluence.timeout ?? 30000,
    };
    newCredentials.confluence = buildCredentials(data.confluence, data.confluence.auth_type);
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
