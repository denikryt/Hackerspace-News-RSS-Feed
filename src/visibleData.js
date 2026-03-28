export function getEffectiveItemDate(item) {
  return item?.displayDate || item?.publishedAt || item?.updatedAt || undefined;
}

export function isFutureDatedItem(item, { now = Date.now() } = {}) {
  const effectiveDate = getEffectiveItemDate(item);

  if (!effectiveDate) {
    return false;
  }

  const timestamp = Date.parse(effectiveDate);
  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp > now;
}

export function filterNormalizedPayloadForDisplay(normalizedPayload, { now = Date.now() } = {}) {
  return {
    ...normalizedPayload,
    feeds: (normalizedPayload.feeds || []).map((feed) => ({
      ...feed,
      items: (feed.items || []).filter((item) => !isFutureDatedItem(item, { now })),
    })),
    curated: normalizedPayload.curated
      ? {
          ...normalizedPayload.curated,
          items: (normalizedPayload.curated.items || []).filter((item) => !isFutureDatedItem(item, { now })),
        }
      : normalizedPayload.curated,
  };
}
