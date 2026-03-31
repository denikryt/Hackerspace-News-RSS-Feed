import { slugify } from "./utils/slugify.js";

export function getCountryFeedSlug(country) {
  return slugify(country);
}

export function getCountryFeedHref(country, pageNumber = 1) {
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `/feed/countries/${countrySlug}/index.html`
    : `/feed/countries/${countrySlug}/page/${pageNumber}/`;
}

export function getCountryFeedOutputPath(country, pageNumber = 1) {
  const countrySlug = getCountryFeedSlug(country);
  return pageNumber <= 1
    ? `feed/countries/${countrySlug}/index.html`
    : `feed/countries/${countrySlug}/page/${pageNumber}/index.html`;
}
