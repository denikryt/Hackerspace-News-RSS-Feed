import { describe, expect, it } from "vitest";

import { normalizeCategoriesWithDictionary } from "../../src/categoryDictionary.js";

describe("categoryDictionary", () => {
  it("maps observed multilingual event variants only through explicit entries", () => {
    expect(
      normalizeCategoriesWithDictionary([
        "Events",
        "Evénements",
        "Evenement",
        "Evénement",
        "évènement",
        "Veranstaltung",
        "Tapahtumat",
      ]),
    ).toEqual({
      normalizedCategories: ["event"],
      unmappedCategories: undefined,
    });
  });

  it("maps observed multilingual news and project variants through explicit entries", () => {
    expect(
      normalizeCategoriesWithDictionary([
        "News",
        "Nieuws",
        "Uutiset",
        "Новини",
        "Projects",
        "project",
        "projet",
        "Projets",
        "Projekte",
        "Projektit",
        "Projects @en",
      ]),
    ).toEqual({
      normalizedCategories: ["news", "project"],
      unmappedCategories: undefined,
    });
  });

  it("maps additional observed variants into existing canonical categories through explicit entries", () => {
    expect(
      normalizeCategoriesWithDictionary([
        "Event",
        "Veranstaltungen",
        "Evenementen",
        "Eventi",
        "Veranstaltungshinweis",
        "Nieuws",
        "Nyheter",
        "Новости",
        "Neuigkeit",
        "Projekter",
        "Workshops",
        "Uncategorised",
        "Unkategorisiert",
        "Nicht kategorisiert",
        "Ohne Kategorie",
        "Sin categoría",
        "Hacklab",
        "Hackspace",
        "HackSpace",
        "MakerSpace",
      ]),
    ).toEqual({
      normalizedCategories: [
        "event",
        "news",
        "project",
        "workshop",
        "uncategorized",
        "hackerspace",
      ],
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
