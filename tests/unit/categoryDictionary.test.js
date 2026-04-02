import { describe, expect, it } from "vitest";

import categoryDictionaryConfig from "../../config/category_dictionary.json" with { type: "json" };
import { normalizeCategoriesWithDictionary } from "../../src/categoryDictionary.js";

describe("categoryDictionary", () => {
  it("loads explicit category mappings from config json", () => {
    expect(categoryDictionaryConfig).toEqual(expect.any(Object));
    expect(Object.keys(categoryDictionaryConfig).length).toBeGreaterThan(0);
  });

  it("normalizes mapped category values through explicit dictionary entries", () => {
    expect(
      normalizeCategoriesWithDictionary([
        "Events",
        "Nieuws",
        "Projects",
        "Workshop",
      ]),
    ).toMatchObject({
      normalizedCategories: expect.arrayContaining(["event", "news", "project", "workshop"]),
      unmappedCategories: undefined,
    });
  });

  it("keeps unmapped observed values visible when the dictionary has no explicit entry", () => {
    expect(
      normalizeCategoriesWithDictionary([
        "Ouverture au public",
        "Hacklab BXL",
        "Thema avond",
      ]),
    ).toEqual({
      normalizedCategories: undefined,
      unmappedCategories: ["Ouverture au public", "Hacklab BXL", "Thema avond"],
    });
  });
});
