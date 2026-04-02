import { describe, expect, it } from "vitest";

import categoryDictionaryConfig from "../../config/category_dictionary.json" with { type: "json" };
import { normalizeCategoriesWithDictionary } from "../../src/categoryDictionary.js";

describe("categoryDictionary", () => {
  it("keeps the explicit dictionary entries in config json", () => {
    expect(categoryDictionaryConfig.events).toBe("event");
    expect(categoryDictionaryConfig.nyheter).toBe("news");
    expect(categoryDictionaryConfig.projekter).toBe("project");
    expect(categoryDictionaryConfig.workshops).toBe("workshop");
    expect(categoryDictionaryConfig["sin categoría"]).toBe("uncategorized");
    expect(categoryDictionaryConfig.hackspace).toBe("hackerspace");
  });

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
        "Announcements",
        "Announcement",
        "Ankündigungen",
        "Annoucements",
        "Posts",
        "Update",
        "webnews",
        "Блог",
        "realraum News",
        "Hackforge News",
        "BFZ News",
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
