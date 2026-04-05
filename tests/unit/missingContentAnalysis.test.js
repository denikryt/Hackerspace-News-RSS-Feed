import { describe, expect, it } from "vitest";
import { vi } from "vitest";

import {
  analyzeMissingContentItems,
  buildMissingContentAnalysisReport,
  renderMissingContentAnalysisMarkdown,
} from "../../src/missingContentAnalysis.js";

describe("buildMissingContentAnalysisReport", () => {
  it("counts items with raw content and description tags per hackerspace feed", () => {
    const report = buildMissingContentAnalysisReport({
      sourceRows: [
        { rowNumber: 1, hackerspaceName: "Alpha", candidateFeedUrl: "https://alpha.example/feed.xml" },
        { rowNumber: 2, hackerspaceName: "Beta", candidateFeedUrl: "https://beta.example/feed.xml" },
      ],
      collectedRecords: [
        {
          sourceRow: {
            rowNumber: 1,
            hackerspaceName: "Alpha",
            candidateFeedUrl: "https://alpha.example/feed.xml",
          },
          validation: {
            finalUrl: "https://alpha.example/feed.xml",
          },
          parsedFeed: {
            items: [{ title: "Alpha 1" }, { title: "Alpha 2" }, { title: "Alpha 3" }],
          },
          rawXmlBody: `<?xml version="1.0"?>
            <rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
              <channel>
                <item><title>Alpha 1</title><content:encoded><![CDATA[<p>Full</p>]]></content:encoded></item>
                <item><title>Alpha 2</title><content>Body</content></item>
                <item><title>Alpha 3</title><description>Summary only</description></item>
              </channel>
            </rss>`,
          status: "parsed",
        },
        {
          sourceRow: {
            rowNumber: 2,
            hackerspaceName: "Beta",
            candidateFeedUrl: "https://beta.example/feed.xml",
          },
          validation: {
            finalUrl: "https://beta.example/feed.xml",
          },
          parsedFeed: {
            items: [{ title: "Beta 1" }, { title: "Beta 2" }],
          },
          rawXmlBody: `<?xml version="1.0"?>
            <rss version="2.0">
              <channel>
                <item><title>Beta 1</title><description /></item>
                <item><title>Beta 2</title></item>
              </channel>
            </rss>`,
          status: "parsed",
        },
        {
          sourceRow: {
            rowNumber: 3,
            hackerspaceName: "Gamma",
            candidateFeedUrl: "https://gamma.example/feed.xml",
          },
          validation: {
            finalUrl: "https://gamma.example/feed.xml",
          },
          parsedFeed: null,
          rawXmlBody: null,
          status: "validation_error",
        },
      ],
      generatedAt: "2026-04-04T10:00:00.000Z",
    });

    expect(report).toMatchObject({
      generatedAt: "2026-04-04T10:00:00.000Z",
      sourceCount: 2,
      analyzedFeedCount: 2,
      totalPublicationCount: 5,
      itemsWithContentCount: 2,
      itemsWithDescriptionCount: 2,
    });

    expect(report.feeds).toEqual([
      {
        totalItems: 3,
        hackerspaceName: "Alpha",
        feedUrl: "https://alpha.example/feed.xml",
        contentItemCount: 2,
        descriptionItemCount: 1,
        contentEmptyItemCount: 0,
        descriptionEmptyItemCount: 0,
      },
      {
        totalItems: 2,
        hackerspaceName: "Beta",
        feedUrl: "https://beta.example/feed.xml",
        contentItemCount: 0,
        descriptionItemCount: 1,
        contentEmptyItemCount: 0,
        descriptionEmptyItemCount: 1,
      },
    ]);

    expect(renderMissingContentAnalysisMarkdown(report)).toContain("# Item Content Tag Presence Analysis");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("- Parsed feeds: 2");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("- Publications analyzed: 5");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("- Items with raw content/content:encoded: 2");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("- Items with raw description: 2");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("Beta");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("[https://beta.example/feed.xml](https://beta.example/feed.xml)");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("| Hackerspace | Feed | Content | Description | Content empty | Description empty |");
    expect(renderMissingContentAnalysisMarkdown(report)).toContain("| Beta | [https://beta.example/feed.xml](https://beta.example/feed.xml) | 0 | 1 | 0 | 1 |");
    expect(
      renderMissingContentAnalysisMarkdown({
        ...report,
        feeds: [
          {
            hackerspaceName: "Long",
            feedUrl: "https://example.com/very/long/feed/path/that/should/be/truncated.xml",
            totalItems: 10,
            contentItemCount: 5,
            descriptionItemCount: 7,
            contentEmptyItemCount: 2,
            descriptionEmptyItemCount: 1,
          },
        ],
      }),
    ).toContain("[https://example.com/very/long/feed…](https://example.com/very/long/feed/path/that/should/be/truncated.xml)");
  });

  it("logs pipeline stages and feed collection progress for direct analysis runs", async () => {
    const logger = vi.fn();
    const loadAnalysisSourceRowsImpl = vi.fn().mockResolvedValue({
      sourceRows: [{ hackerspaceName: "Alpha", candidateFeedUrl: "https://alpha.example/feed.xml" }],
    });
    const collectAnalysisFeedsImpl = vi.fn().mockResolvedValue({
      records: [
        {
          status: "parsed",
          sourceRow: { hackerspaceName: "Alpha", candidateFeedUrl: "https://alpha.example/feed.xml" },
          validation: { finalUrl: "https://alpha.example/feed.xml" },
          rawXmlBody: "<rss><channel><item><content>Body</content></item></channel></rss>",
        },
      ],
    });
    const writeMissingContentAnalysisArtifactsImpl = vi.fn().mockResolvedValue(undefined);

    await analyzeMissingContentItems({
      logger,
      writeArtifact: true,
      loadAnalysisSourceRowsImpl,
      collectAnalysisFeedsImpl,
      writeMissingContentAnalysisArtifactsImpl,
    });

    expect(logger).toHaveBeenCalledWith("[analyze] loading source rows");
    expect(logger).toHaveBeenCalledWith("[analyze] collecting feeds");
    expect(logger).toHaveBeenCalledWith("[analyze] building item content tag presence report");
    expect(logger).toHaveBeenCalledWith("[analyze] writing analysis artifacts");
    expect(collectAnalysisFeedsImpl).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
      }),
    );
  });
});
