import { z } from "zod";

// Validation is intentionally narrow: only the fields consumed by the current render path matter here.
const renderSummarySchema = z.object({
  sourceRows: z.number(),
  validFeeds: z.number(),
  parsedFeeds: z.number(),
  emptyFeeds: z.number(),
  failedFeeds: z.number(),
});

const renderAttachmentSchema = z.object({
  url: z.string().optional(),
  type: z.string().optional(),
  title: z.string().optional(),
  label: z.string().optional(),
}).passthrough();

const renderFeedItemSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  link: z.string().optional(),
  resolvedAuthor: z.string().optional(),
  authorSource: z.string().optional(),
  publishedAt: z.string().optional(),
  updatedAt: z.string().optional(),
  displayDate: z.string().optional(),
  summary: z.string().optional(),
  summaryText: z.string().optional(),
  summaryHtml: z.string().optional(),
  contentText: z.string().optional(),
  contentHtml: z.string().optional(),
  normalizedCategories: z.array(z.string()).optional(),
  categoriesRaw: z.array(z.string()).optional(),
  attachments: z.array(renderAttachmentSchema).optional(),
}).passthrough();

const renderFeedSchema = z.object({
  id: z.string().optional(),
  rowNumber: z.number().optional(),
  sourceWikiUrl: z.string().optional(),
  finalFeedUrl: z.string().optional(),
  siteUrl: z.string().optional(),
  spaceName: z.string(),
  country: z.string().optional(),
  feedType: z.string().optional(),
  status: z.string().optional(),
  items: z.array(renderFeedItemSchema),
}).passthrough();

const renderFailureSchema = z.object({
  hackerspaceName: z.string(),
  sourceWikiUrl: z.string().optional(),
  country: z.string().optional(),
  candidateUrl: z.string().optional(),
  errorCode: z.string().optional(),
}).passthrough();

const normalizedRenderPayloadSchema = z.object({
  generatedAt: z.string().optional(),
  sourcePageUrl: z.string().optional(),
  summary: renderSummarySchema,
  feeds: z.array(renderFeedSchema),
  failures: z.array(renderFailureSchema),
}).passthrough();

// Render validation should protect the render path without overfitting the whole snapshot format.
export function validateNormalizedRenderPayload(value) {
  return normalizedRenderPayloadSchema.parse(value);
}

// visibleData depends on the same date-bearing item fields, so it uses the same validated subset.
export function validateNormalizedRenderPayloadForDisplay(value) {
  return validateNormalizedRenderPayload(value);
}
