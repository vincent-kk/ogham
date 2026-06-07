import { executeRequest } from "../../../core/httpClient/index.js";
import type {
  FetchContext,
  McpResponse,
  FetchParams,
} from "../../../types/index.js";
import { attachPrefix, transformRequest } from "../../../utils/index.js";
import { autoConvertAdf } from "./utils/autoConvertAdf.js";
import { convertBody } from "./utils/convertBody.js";
import { handleAssetFetch } from "./utils/assetFetch.js";

/** Unified HTTP tool handler */
export async function handleFetch(
  params: FetchParams,
  ctx: FetchContext,
): Promise<McpResponse> {
  const { method } = params;
  const config = ctx.http;
  // V2 logical → V1 physical (Confluence DC), V2-only guard. Pass-through otherwise.
  const transformed = transformRequest(
    params.endpoint,
    params.body,
    ctx.service,
    ctx.apiVersion,
  );
  // Attach service+version prefix to the (now physical) endpoint.
  const endpoint = attachPrefix(
    transformed.endpoint,
    ctx.service,
    ctx.apiVersion,
  );

  // Early validation: reject invalid method+param combos
  if (method === "GET" && params.body !== undefined) {
    throw new Error("GET requests must not include a body");
  }
  if (method === "DELETE" && params.body !== undefined) {
    throw new Error("DELETE requests must not include a body");
  }

  switch (method) {
    case "GET": {
      // Asset fetch: binary download with caching
      if (params.save_to_path) {
        return handleAssetFetch(
          {
            endpoint,
            query_params: params.query_params,
            headers: params.headers,
            save_to_path: params.save_to_path,
            force: params.force,
          },
          config,
        );
      }

      // Document fetch: JSON API with ADF conversion
      const queryParams = { ...params.query_params };
      if (params.expand && params.expand.length > 0) {
        queryParams["expand"] = params.expand.join(",");
      }

      const response = await executeRequest(config, {
        method: "GET",
        endpoint,
        query_params:
          Object.keys(queryParams).length > 0 ? queryParams : undefined,
        headers: params.headers,
      });

      if (response.success && response.data && params.accept_format !== "raw") {
        response.data = autoConvertAdf(response.data);
      }

      return response;
    }

    case "POST": {
      const headers = { ...params.headers };

      if (params.content_type) {
        headers["Content-Type"] = params.content_type;
      }

      if (
        params.content_type === "multipart/form-data" ||
        ctx.requires_xsrf_bypass
      ) {
        headers["X-Atlassian-Token"] = "no-check";
      }

      let body = transformed.body;
      if (params.content_format === "markdown") {
        body = convertBody(body, ctx.service, ctx.apiVersion);
      }

      return executeRequest(config, {
        method: "POST",
        endpoint,
        body,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }

    case "PUT":
    case "PATCH": {
      let body = transformed.body;
      if (params.content_format === "markdown") {
        body = convertBody(body, ctx.service, ctx.apiVersion);
      }

      const headers = { ...params.headers };
      if (ctx.requires_xsrf_bypass) {
        headers["X-Atlassian-Token"] = "no-check";
      }

      return executeRequest(config, {
        method,
        endpoint,
        body,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }

    case "DELETE": {
      const headers = { ...params.headers };
      if (ctx.requires_xsrf_bypass) {
        headers["X-Atlassian-Token"] = "no-check";
      }
      return executeRequest(config, {
        method: "DELETE",
        endpoint,
        query_params: params.query_params,
        headers: Object.keys(headers).length > 0 ? headers : undefined,
      });
    }
  }
}
