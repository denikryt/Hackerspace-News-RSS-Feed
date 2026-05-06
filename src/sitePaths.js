// Public navigation hrefs stay centralized here so renderers, pagination, and
// view models all point at the same canonical slash-based URLs.
export function getHomeHref() {
  return "/";
}

export function getAboutHref() {
  return "/about/";
}

export function getAuthorsIndexHref() {
  return "/authors/";
}

export function getNewsIndexHref() {
  return "/news/";
}

export function getCuratedHref() {
  return "/curated/";
}
