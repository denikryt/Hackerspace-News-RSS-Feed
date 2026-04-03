import categoryDictionaryConfig from "../config/category_dictionary.json" with { type: "json" };

/**
 * Keep the explicit category mapping in config so editorial updates do not
 * require editing code. The module remains responsible only for normalization.
 */
const CATEGORY_DICTIONARY = categoryDictionaryConfig;

export function normalizeCategoriesWithDictionary(categoriesRaw) {
  if (!Array.isArray(categoriesRaw) || categoriesRaw.length === 0) {
    return {
      normalizedCategories: undefined,
      unmappedCategories: undefined,
    };
  }

  const normalizedCategories = [];
  const unmappedCategories = [];

  for (const rawValue of categoriesRaw) {
    if (!rawValue) {
      continue;
    }

    const trimmedValue = String(rawValue).trim();
    if (!trimmedValue) {
      continue;
    }

    const lookupKey = trimmedValue.toLowerCase().replace(/\s+/g, " ");
    const normalizedValue = CATEGORY_DICTIONARY[lookupKey];

    if (normalizedValue) {
      normalizedCategories.push(normalizedValue);
      continue;
    }

    unmappedCategories.push(trimmedValue);
  }

  return {
    normalizedCategories: uniqueValues(normalizedCategories),
    unmappedCategories: uniqueValues(unmappedCategories),
  };
}

function uniqueValues(values) {
  if (!values.length) {
    return undefined;
  }

  return [...new Set(values)];
}
