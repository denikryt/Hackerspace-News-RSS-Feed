/**
 * Shared type-bearing contracts for the render-side TS/TSX trial.
 * These types stay narrow and focused on the boundaries that actually matter.
 */

export type AuthorLink = {
  href: string;
  label: string;
};

export type PageHeaderNavItem = {
  href: string;
  isCurrent?: boolean | undefined;
  label: string;
};

export type RenderPageHeaderProps = {
  headerClass?: string | undefined;
  introHtml?: string | undefined;
  navClass?: string | undefined;
  navItems?: PageHeaderNavItem[] | undefined;
  title: string;
  titleClass?: string | undefined;
};

export type PaginationPageLink =
  | {
      href: string;
      isCurrent: boolean;
      page: number;
      type: "page";
    }
  | {
      type: "ellipsis";
    };

export type RenderPaginationModel = {
  currentPage?: number | undefined;
  hasNextPage?: boolean | undefined;
  hasPreviousPage?: boolean | undefined;
  nextPageHref?: string | undefined;
  pageLinks?: PaginationPageLink[] | undefined;
  previousPageHref?: string | undefined;
  totalPages?: number | undefined;
};

export type RenderSummary = {
  emptyFeeds: number;
  failedFeeds: number;
  parsedFeeds: number;
  sourceRows: number;
  validFeeds: number;
};

export type RenderAttachment = {
  label?: string | undefined;
  title?: string | undefined;
  type?: string | undefined;
  url?: string | undefined;
};

export type RenderFeedItem = {
  attachments?: RenderAttachment[] | undefined;
  authorSource?: string | undefined;
  categoriesRaw?: string[] | undefined;
  contentHtml?: string | undefined;
  contentText?: string | undefined;
  displayDate?: string | undefined;
  id?: string | undefined;
  link?: string | undefined;
  normalizedCategories?: string[] | undefined;
  publishedAt?: string | undefined;
  resolvedAuthor?: string | undefined;
  summary?: string | undefined;
  summaryHtml?: string | undefined;
  summaryText?: string | undefined;
  title?: string | undefined;
  updatedAt?: string | undefined;
};

export type RenderFeed = {
  country?: string | undefined;
  feedType?: string | undefined;
  finalFeedUrl?: string | undefined;
  id?: string | undefined;
  items: RenderFeedItem[];
  rowNumber?: number | undefined;
  siteUrl?: string | undefined;
  sourceWikiUrl?: string | undefined;
  spaceName: string;
  status?: string | undefined;
};

export type RenderFailure = {
  candidateUrl?: string | undefined;
  country?: string | undefined;
  errorCode?: string | undefined;
  hackerspaceName: string;
  sourceWikiUrl?: string | undefined;
};

export type NormalizedRenderPayload = {
  failures: RenderFailure[];
  feeds: RenderFeed[];
  generatedAt?: string | undefined;
  sourcePageUrl?: string | undefined;
  summary: RenderSummary;
};
