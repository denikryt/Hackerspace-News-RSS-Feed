import { getContentStreamDefinition } from "./contentStreams.js";
import { slugify } from "./utils/slugify.js";

export function getCountryFeedSlug(country) {
  return slugify(country);
}

export function getCountryFeedHref(streamId, country, pageNumber = 1) {
  const { segment } = getContentStreamDefinition(streamId);
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `/${segment}/countries/${countrySlug}/index.html`
    : `/${segment}/countries/${countrySlug}/page/${pageNumber}/`;
}

export function getCountryFeedOutputPath(streamId, country, pageNumber = 1) {
  const { segment } = getContentStreamDefinition(streamId);
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `${segment}/countries/${countrySlug}/index.html`
    : `${segment}/countries/${countrySlug}/page/${pageNumber}/index.html`;
}
