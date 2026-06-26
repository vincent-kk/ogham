import { HttpMethod } from "../../../types/enums.js";
import {
  AUTO_POST_ID_THRESHOLD,
  AUTO_POST_URL_THRESHOLD,
} from "../../../constants/defaults.js";

/**
 * Decide GET vs POST. EFetch/ESummary with many UIDs (or a long GET URL) hit
 * the ~414 URI-too-long limit, so switch to POST
 * (application/x-www-form-urlencoded) automatically. The caller never has to
 * think about it.
 */
export function decideMethod(
  params: Record<string, string>,
  getUrlLength: number,
): HttpMethod {
  const idValue = params.id;
  const idCount =
    typeof idValue === "string" && idValue.length > 0
      ? idValue.split(",").length
      : 0;

  if (idCount > AUTO_POST_ID_THRESHOLD) return HttpMethod.POST;
  if (getUrlLength > AUTO_POST_URL_THRESHOLD) return HttpMethod.POST;
  return HttpMethod.GET;
}
