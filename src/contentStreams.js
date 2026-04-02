export const FEED_CONTENT_STREAM_ID = "feed";
export const FALLBACK_CONTENT_STREAM_ID = "other";
export const PUBLIC_CATEGORY_STREAM_IDS = ["community", "event", "news", "blog", "project", "hackerspace", "workshop"];

const CONTENT_STREAM_DEFINITIONS = {
  feed: {
    id: "feed",
    segment: "feed",
    label: "Feed",
    pageTitle: "Feed",
    pageIntro: "All publications sorted from new to old.",
  },
  community: {
    id: "community",
    segment: "community",
    label: "Community",
    pageTitle: "Community",
    pageIntro: "Items tagged as community updates and activities.",
  },
  event: {
    id: "event",
    segment: "events",
    label: "Events",
    pageTitle: "Events",
    pageIntro: "Items tagged as events.",
  },
  news: {
    id: "news",
    segment: "news",
    label: "News",
    pageTitle: "News",
    pageIntro: "Items tagged as news.",
  },
  blog: {
    id: "blog",
    segment: "blogs",
    label: "Blogs",
    pageTitle: "Blogs",
    pageIntro: "Items tagged as blog posts.",
  },
  project: {
    id: "project",
    segment: "projects",
    label: "Projects",
    pageTitle: "Projects",
    pageIntro: "Items tagged as projects.",
  },
  hackerspace: {
    id: "hackerspace",
    segment: "hackerspaces",
    label: "Hackerspaces",
    pageTitle: "Hackerspaces",
    pageIntro: "Items tagged as hackerspace updates.",
  },
  workshop: {
    id: "workshop",
    segment: "workshops",
    label: "Workshops",
    pageTitle: "Workshops",
    pageIntro: "Items tagged as workshops.",
  },
  other: {
    id: "other",
    segment: "other",
    label: "Other",
    pageTitle: "Other",
    pageIntro: "Items outside the public category streams.",
  },
};

export function getContentStreamDefinition(streamId) {
  const definition = CONTENT_STREAM_DEFINITIONS[streamId];

  if (!definition) {
    throw new Error(`Unknown content stream: ${streamId}`);
  }

  return definition;
}

export function getContentStreamHref(streamId, pageNumber = 1) {
  const { segment } = getContentStreamDefinition(streamId);
  return pageNumber <= 1 ? `/${segment}/index.html` : `/${segment}/page/${pageNumber}/`;
}

export function getContentStreamOutputPath(streamId, pageNumber = 1) {
  const { segment } = getContentStreamDefinition(streamId);
  return pageNumber <= 1 ? `${segment}/index.html` : `${segment}/page/${pageNumber}/index.html`;
}
