import { describe, expect, it } from "vitest";

import { renderAboutPage } from "../../src/renderers/renderAboutPage.js";
import { renderCalendarPage } from "../../src/renderers/renderCalendarPage.js";
import { renderAuthorDetail } from "../../src/renderers/renderAuthorDetail.js";
import { renderAuthorsIndex } from "../../src/renderers/renderAuthorsIndex.js";
import { renderGlobalFeed } from "../../src/renderers/renderGlobalFeed.js";
import { renderSpaceDetail } from "../../src/renderers/renderSpaceDetail.js";
import { renderSpacesIndex } from "../../src/renderers/renderSpacesIndex.js";
import {
  renderAboutPageTsx,
  renderCalendarPageTsx,
  renderAuthorDetailPageTsx,
  renderAuthorsIndexPageTsx,
  renderGlobalFeedPageTsx,
  renderSpaceDetailPageTsx,
  renderSpacesIndexPageTsx,
} from "../../src/renderers-tsx/pages.tsx";

describe("page renderer TSX parity", () => {
  it("matches the current about page output", () => {
    expect(renderAboutPageTsx()).toBe(renderAboutPage());
  });

  it("matches the current calendar page output", () => {
    const model = {
      pageTitle: "Calendar",
      pageIntro: "Upcoming events from ICS feeds.",
      selectedDate: "2026-05-14",
      selectedDateLabel: "Thursday, May 14, 2026",
      selectedMonthLabel: "May 2026",
      weekDayLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      weeks: [
        [
          { date: "2026-05-11", dayNumber: 11, isCurrentMonth: true, isSelected: false, hasEvents: false },
          { date: "2026-05-12", dayNumber: 12, isCurrentMonth: true, isSelected: false, hasEvents: false },
          { date: "2026-05-13", dayNumber: 13, isCurrentMonth: true, isSelected: false, hasEvents: false },
          { date: "2026-05-14", dayNumber: 14, isCurrentMonth: true, isSelected: true, hasEvents: true },
          { date: "2026-05-15", dayNumber: 15, isCurrentMonth: true, isSelected: false, hasEvents: false },
          { date: "2026-05-16", dayNumber: 16, isCurrentMonth: true, isSelected: false, hasEvents: false },
          { date: "2026-05-17", dayNumber: 17, isCurrentMonth: true, isSelected: false, hasEvents: false },
        ],
      ],
      selectedDayEvents: [
        {
          summary: "DC415",
          dateLabel: "Thu, May 14, 2026",
          timeLabel: "7:30 PM - 10:00 PM",
          location: "Noisebridge",
          url: "https://example.com/dc415",
          categories: [],
        },
      ],
      serializedEventsJson: "[]",
      serializedInitialStateJson: "{\"selectedDate\":\"2026-05-14\",\"selectedMonth\":\"2026-05\"}",
      navItems: [
        { href: "/", label: "Hackerspaces" },
        { href: "/news/", label: "News" },
        { href: "/calendar/", label: "Calendar", isCurrent: true },
        { href: "/authors/", label: "Authors" },
      ],
    };

    expect(renderCalendarPageTsx(model)).toBe(renderCalendarPage(model));
  });

  it("matches the current spaces index page output", () => {
    const model = {
      generatedAt: "2026-03-19T20:00:00.000Z",
      summary: {
        sourceRows: 3,
        parsedFeeds: 1,
      },
      sortMode: "alphabetical",
      showFailed: false,
      searchQuery: "beta",
      selectedCountry: "all",
      availableCountries: ["France", "Germany"],
      cards: [
        {
          spaceName: "BetaMachine",
          country: "France",
          sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
          siteUrl: "https://www.betamachine.fr",
          isVisibleByDefault: true,
          isFailure: false,
          publicationsCount: 12,
          latestItemTitle: "Newest post",
          latestItemDate: "2025-01-02T10:00:00.000Z",
          latestItemLink: "https://www.betamachine.fr/newest",
          detailHref: "/spaces/betamachine.html",
        },
      ],
      visibleCards: [],
    };

    expect(renderSpacesIndexPageTsx(model)).toBe(renderSpacesIndex(model));
  });

  it("matches the current authors index page output", () => {
    const model = {
      selectedHackerspace: "all",
      authorQuery: "ali",
      sortMode: "alphabetical",
      availableHackerspaces: ["BetaMachine", "C3D2"],
      authors: [
        {
          displayName: "Alice",
          slug: "alice",
          itemCount: 2,
          latestItemDate: "2025-01-02T10:00:00.000Z",
          detailHref: "/authors/alice.html",
          hackerspaces: [
            { name: "BetaMachine", href: "/spaces/betamachine.html" },
            { name: "C3D2", href: "/spaces/c3d2.html" },
          ],
        },
      ],
      visibleAuthors: [],
    };

    expect(renderAuthorsIndexPageTsx(model)).toBe(renderAuthorsIndex(model));
  });

  it("matches the current global feed page output", () => {
    const model = {
      items: [
        {
          title: "Plain post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          link: "https://example.com/plain-post",
          displayDate: "2025-01-01T10:00:00.000Z",
          displayContent: {
            renderMode: "text",
            text: "Prepared summary",
            attachments: [],
          },
          authorLinks: [
            { label: "Alice", href: "/authors/alice.html" },
            { label: "Bob", href: "/authors/bob.html" },
          ],
        },
      ],
      homeHref: "/",
      pageTitle: "Feed",
      pageIntro: "All publications sorted from new to old.",
      currentPageLabel: "Page 1 of 1",
      publicationCountLabel: "1 of 1 publications",
      streamNavItems: [{ href: "/news/", label: "News", isCurrent: true }],
    };

    expect(renderGlobalFeedPageTsx(model)).toBe(renderGlobalFeed(model));
  });

  it("matches the current space detail page output", () => {
    const model = {
      spaceName: "BetaMachine",
      country: "France",
      sourceWikiUrl: "https://wiki.hackerspaces.org/BetaMachine",
      siteUrl: "https://www.betamachine.fr",
      homeHref: "/",
      feedHref: "/news/",
      authorsIndexHref: "/authors/",
      currentPageLabel: "Page 1 of 1",
      items: [
        {
          title: "HTML post",
          displayDate: "2025-01-01T10:00:00.000Z",
          link: "https://example.com/post",
          authorLinks: [{ label: "Alice", href: "/authors/alice.html" }],
          displayContent: {
            renderMode: "html",
            html: '<p>Hello <a href="https://example.com/post">link</a></p>',
            attachments: [],
          },
          normalizedCategories: ["events", "news"],
        },
      ],
    };

    expect(renderSpaceDetailPageTsx(model)).toBe(renderSpaceDetail(model));
  });

  it("matches the current author detail page output while keeping a separate module", () => {
    const model = {
      authorDisplayName: "Alice",
      items: [
        {
          title: "Alice post",
          spaceName: "BetaMachine",
          spaceHref: "/spaces/betamachine.html",
          displayDate: "2025-01-02T10:00:00.000Z",
        },
      ],
      homeHref: "/",
      feedHref: "/news/",
      authorsIndexHref: "/authors/",
      currentPageLabel: "Page 2 of 5",
      publicationCountLabel: "1 of 41 publications",
      hasPreviousPage: true,
      hasNextPage: true,
      previousPageHref: "/authors/alice.html",
      nextPageHref: "/authors/alice/page/3/",
      pageLinks: [
        { type: "page", page: 1, href: "/authors/alice.html", isCurrent: false },
        { type: "page", page: 2, href: "/authors/alice/page/2/", isCurrent: true },
        { type: "page", page: 3, href: "/authors/alice/page/3/", isCurrent: false },
      ],
    };

    expect(renderAuthorDetailPageTsx(model)).toBe(renderAuthorDetail(model));
  });
});
