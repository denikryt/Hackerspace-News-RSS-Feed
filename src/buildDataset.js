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
    calendarPayload: refreshResult.calendarPayload,
    calendarIndexPayload: refreshResult.calendarIndexPayload,
    now,
  });

  return {
    ...refreshResult,
    site: {
      pages: site.pages,
    },
  };
}
