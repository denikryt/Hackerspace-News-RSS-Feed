/**
 * Feed-section category pages must mirror the canonical category ids produced
 * by the dictionary. This keeps routing, normalization, and page generation on
 * one explicit contract instead of silently drifting apart.
 */
export function assertFeedSectionCategoryContract({
  feedSectionsConfig,
  categoryDictionary,
  specialSectionIds,
}) {
  const categoryFeedSectionIds = getCategoryFeedSectionIds(feedSectionsConfig, specialSectionIds);
  const canonicalCategoryIds = getCanonicalCategoryIds(categoryDictionary);

  const missingFeedSections = canonicalCategoryIds.filter(
    (categoryId) => !categoryFeedSectionIds.includes(categoryId),
  );
  const extraFeedSections = categoryFeedSectionIds.filter(
    (sectionId) => !canonicalCategoryIds.includes(sectionId),
  );

  if (missingFeedSections.length === 0 && extraFeedSections.length === 0) {
    return;
  }

  const errorParts = [
    "Feed section/category contract mismatch.",
    `Canonical categories from category_dictionary.json: ${canonicalCategoryIds.join(", ") || "(none)"}.`,
    `Category feed-section keys from feed_sections.json: ${categoryFeedSectionIds.join(", ") || "(none)"}.`,
  ];

  if (missingFeedSections.length > 0) {
    errorParts.push(`Missing feed sections: ${missingFeedSections.join(", ")}.`);
  }

  if (extraFeedSections.length > 0) {
    errorParts.push(`Extra feed sections: ${extraFeedSections.join(", ")}.`);
  }

  throw new Error(errorParts.join(" "));
}

export function getCategoryFeedSectionIds(feedSectionsConfig, specialSectionIds) {
  const specialIds = new Set(specialSectionIds);

  return Object.keys(feedSectionsConfig)
    .filter((sectionId) => !specialIds.has(sectionId))
    .sort((left, right) => left.localeCompare(right));
}

export function getCanonicalCategoryIds(categoryDictionary) {
  return [...new Set(Object.values(categoryDictionary))]
    .sort((left, right) => left.localeCompare(right));
}
