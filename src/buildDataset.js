import { refreshDataset } from "./refreshDataset.js";
import { renderSite } from "./renderSite.js";

export async function buildDataset({
  sourcePageUrl,
  fetchImpl = fetch,
  now = Date.now(),
} = {}) {
  const refreshResult = await refreshDataset({ sourcePageUrl, fetchImpl });
  const site = await renderSite({
    sourceRowsPayload: refreshResult.sourceRowsPayload,
    validationsPayload: refreshResult.validationsPayload,
    normalizedPayload: refreshResult.normalizedPayload,
    curatedPayload: refreshResult.curatedPayload,
    now,
  });

  return {
    ...refreshResult,
    site: {
      pages: site.pages,
    },
  };
}
