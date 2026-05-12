/**
 * Translate V2-style logical Confluence endpoints to V1 physical paths
 * when targeting Server/Data Center, and adjust the request body envelope.
 *
 * Skills always send V2-style logical paths (`/pages/{id}`, `/spaces/{key}` etc.)
 * with V2-style flat field names (`spaceId`). This module rewrites them per
 * deployment so skills remain version-agnostic.
 *
 * Jira and Confluence Cloud V2 pass through unchanged.
 */

interface LogicalRoute {
  /** V2-style logical path pattern, e.g., `/pages/{id}/children`. */
  v2: string;
  /** V1 physical path pattern, e.g., `/content/{id}/child/page`. */
  v1: string;
  /** Content type injected into body when posting to collection endpoints. */
  contentType?: 'page' | 'comment' | 'attachment';
}

/** Order matters: more specific routes must come before generic ones. */
const ROUTES: LogicalRoute[] = [
  { v2: '/pages/{id}/children', v1: '/content/{id}/child/page' },
  { v2: '/pages/{id}/footer-comments', v1: '/content/{id}/child/comment' },
  { v2: '/pages/{id}/attachments', v1: '/content/{id}/child/attachment' },
  { v2: '/pages/{id}/properties', v1: '/content/{id}/property' },
  { v2: '/pages/{id}', v1: '/content/{id}' },
  { v2: '/pages', v1: '/content', contentType: 'page' },
  { v2: '/footer-comments', v1: '/content', contentType: 'comment' },
  { v2: '/spaces/{id}', v1: '/space/{id}' },
  { v2: '/spaces', v1: '/space' },
];

const V2_ONLY_PREFIXES = [
  '/inline-comments',
  '/whiteboards',
  '/databases',
  '/embeds',
  '/analytics',
];

function splitEndpoint(endpoint: string): { path: string; query: string } {
  const idx = endpoint.indexOf('?');
  if (idx < 0) return { path: endpoint, query: '' };
  return { path: endpoint.slice(0, idx), query: endpoint.slice(idx) };
}

function matchesPattern(
  path: string,
  pattern: string,
): { params: Record<string, string> } | null {
  const pSegs = path.split('/').filter(Boolean);
  const ptSegs = pattern.split('/').filter(Boolean);
  if (pSegs.length !== ptSegs.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < ptSegs.length; i++) {
    const ps = ptSegs[i];
    if (ps.startsWith('{') && ps.endsWith('}')) {
      params[ps.slice(1, -1)] = pSegs[i];
    } else if (ps !== pSegs[i]) {
      return null;
    }
  }
  return { params };
}

function applyTemplate(template: string, params: Record<string, string>): string {
  return (
    '/' +
    template
      .split('/')
      .filter(Boolean)
      .map((s) =>
        s.startsWith('{') && s.endsWith('}') ? (params[s.slice(1, -1)] ?? s) : s,
      )
      .join('/')
  );
}

function isV2OnlyPath(path: string): boolean {
  return V2_ONLY_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

function mapBodyV2ToV1(body: unknown, route: LogicalRoute): unknown {
  if (!body || typeof body !== 'object') return body;
  const obj = { ...(body as Record<string, unknown>) };

  // V2 `spaceId` (flat) → V1 `space: { key }` (nested object).
  // Per design: LLM sends the DC space key in the `spaceId` slot.
  if (obj.spaceId !== undefined) {
    obj.space = { key: String(obj.spaceId) };
    delete obj.spaceId;
  }

  // V1 requires `type` on `/content` collection endpoints.
  if (route.contentType && obj.type === undefined) {
    obj.type = route.contentType;
  }

  // V2-only envelope field — DC ignores or rejects.
  delete obj.status;

  return obj;
}

/**
 * Translate a V2-style logical request into a V1 physical request for
 * Confluence Server/Data Center. Pass-through for Jira and Confluence Cloud V2.
 *
 * @throws if the endpoint is V2-only and the target is Server/DC.
 */
export function transformRequest(
  endpoint: string,
  body: unknown,
  service: 'jira' | 'confluence',
  apiVersion: '2' | '3' | 'v1' | 'v2',
): { endpoint: string; body: unknown } {
  if (service !== 'confluence') return { endpoint, body };
  if (apiVersion === 'v2') return { endpoint, body };

  // Confluence DC (apiVersion === 'v1')
  const { path, query } = splitEndpoint(endpoint);

  if (isV2OnlyPath(path)) {
    throw new Error(
      `Endpoint ${path} is Confluence Cloud V2 only and not available on Server/Data Center.`,
    );
  }

  for (const route of ROUTES) {
    const m = matchesPattern(path, route.v2);
    if (!m) continue;
    const v1Path = applyTemplate(route.v1, m.params);
    return { endpoint: v1Path + query, body: mapBodyV2ToV1(body, route) };
  }

  return { endpoint, body };
}
