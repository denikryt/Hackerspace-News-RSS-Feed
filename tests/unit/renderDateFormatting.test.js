import { afterEach, expect, it, vi } from "vitest";
import { formatCompactDate } from "../../src/renderers/layout.js";
import { buildNewspaperDayModel } from "../../src/viewModels/newspaperFeed.js";
afterEach(() => vi.restoreAllMocks());
it("preserves publication date output, omits invalid dates and reuses fixed native formatters", () => {
    expect(formatCompactDate("2026-12-31T23:30:00-02:00")).toBe("JAN 01, 2027");
    expect(formatCompactDate("invalid")).toBe("");
    const formatter = vi.spyOn(Intl, "DateTimeFormat");
    for (let i = 0; i < 20; i++)
        formatCompactDate("2026-01-01");
    expect(formatter).not.toHaveBeenCalled();
});
it("reuses the newspaper month formatter across independent day pages", () => {
    const formatter = vi.spyOn(Intl, "DateTimeFormat");
    for (let i = 0; i < 20; i++)
        buildNewspaperDayModel([], "2026-01-01", new Date("2026-01-03"), null, ["2026-01-01", "2026-01-02"], new Map());
    expect(formatter).not.toHaveBeenCalled();
});
