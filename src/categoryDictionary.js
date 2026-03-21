const CATEGORY_DICTIONARY = {
  event: "event",
  events: "event",
  evenement: "event",
  evénement: "event",
  evénements: "event",
  événements: "event",
  évènement: "event",
  veranstaltung: "event",
  tapahtumat: "event",
  news: "news",
  nieuws: "news",
  uutiset: "news",
  новини: "news",
  blog: "blog",
  project: "project",
  projects: "project",
  "projects @en": "project",
  projet: "project",
  projets: "project",
  projekte: "project",
  projektit: "project",
  workshop: "workshop",
  uncategorized: "uncategorized",
  hackerspace: "hackerspace",
  hackerspaces: "hackerspace",
  makerspace: "hackerspace",
};

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
