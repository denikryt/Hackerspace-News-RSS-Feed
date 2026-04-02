/**
 * The dictionary intentionally normalizes only explicitly observed variants
 * into a small set of canonical categories. This keeps category collapse
 * conservative and reviewable.
 */
const CATEGORY_DICTIONARY = {
  event: "event",
  events: "event",
  evenement: "event",
  evenementen: "event",
  eventi: "event",
  evénement: "event",
  evénements: "event",
  événements: "event",
  évènement: "event",
  veranstaltung: "event",
  veranstaltungen: "event",
  veranstaltungshinweis: "event",
  tapahtumat: "event",

  news: "news",
  nieuws: "news",
  nyheter: "news",
  neuigkeit: "news",
  uutiset: "news",
  новини: "news",
  новости: "news",

  blog: "blog",

  project: "project",
  projects: "project",
  "projects @en": "project",
  projekter: "project",
  projet: "project",
  projets: "project",
  projekte: "project",
  projektit: "project",

  workshop: "workshop",
  workshops: "workshop",

  uncategorized: "uncategorized",
  uncategorised: "uncategorized",
  unkategorisiert: "uncategorized",
  "nicht kategorisiert": "uncategorized",
  "ohne kategorie": "uncategorized",
  "sin categoría": "uncategorized",

  hackerspace: "hackerspace",
  hackerspaces: "hackerspace",
  hacklab: "hackerspace",
  hackspace: "hackerspace",
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
