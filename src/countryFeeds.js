import { getFeedSectionDefinition } from "./feedSections.js";
import { slugify } from "./utils/slugify.js";

export function getCountryFeedSlug(country) {
  return slugify(country);
}

export function getCountryFeedHref(sectionId, country, pageNumber = 1) {
  const { segment } = getFeedSectionDefinition(sectionId);
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `/${segment}/countries/${countrySlug}/index.html`
    : `/${segment}/countries/${countrySlug}/page/${pageNumber}/`;
}

export function getCountryFeedOutputPath(sectionId, country, pageNumber = 1) {
  const { segment } = getFeedSectionDefinition(sectionId);
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `${segment}/countries/${countrySlug}/index.html`
    : `${segment}/countries/${countrySlug}/page/${pageNumber}/index.html`;
}
