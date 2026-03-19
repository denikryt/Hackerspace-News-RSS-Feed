export const GLOBAL_FEED_PAGE_SIZE = 10;

export function normalizePageNumber(requestedPage, totalPages) {
  const safeTotalPages = Math.max(1, Number(totalPages) || 1);
  const numericPage = Number(requestedPage);

  if (!Number.isInteger(numericPage) || numericPage < 1) {
    return 1;
  }

  if (numericPage > safeTotalPages) {
    return safeTotalPages;
  }

  return numericPage;
}

export function paginateItems(items, currentPage, pageSize = GLOBAL_FEED_PAGE_SIZE) {
  const totalItems = Array.isArray(items) ? items.length : 0;
  const safePageSize = Math.max(1, Number(pageSize) || GLOBAL_FEED_PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(totalItems / safePageSize));
  const page = normalizePageNumber(currentPage, totalPages);
  const startIndex = (page - 1) * safePageSize;
  const endIndex = startIndex + safePageSize;

  return {
    totalItems,
    pageSize: safePageSize,
    totalPages,
    currentPage: page,
    items: (items || []).slice(startIndex, endIndex),
  };
}

export function buildPageLinks(currentPage, totalPages, hrefForPage) {
  if (totalPages <= 1) {
    return [{ type: "page", page: 1, href: hrefForPage(1), isCurrent: true }];
  }

  const pagesToShow = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sortedPages = [...pagesToShow]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const links = [];

  for (let index = 0; index < sortedPages.length; index += 1) {
    const page = sortedPages[index];
    const previous = sortedPages[index - 1];

    if (previous && page - previous > 1) {
      links.push({ type: "ellipsis" });
    }

    links.push({
      type: "page",
      page,
      href: hrefForPage(page),
      isCurrent: page === currentPage,
    });
  }

  return links;
}

export function getGlobalFeedHref(pageNumber) {
  return pageNumber <= 1 ? "/feed/" : `/feed/page/${pageNumber}/`;
}

export function getSpaceDetailHref(spaceSlug, pageNumber) {
  return pageNumber <= 1
    ? `/spaces/${spaceSlug}.html`
    : `/spaces/${spaceSlug}/page/${pageNumber}/`;
}
