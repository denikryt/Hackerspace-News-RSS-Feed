# Wiki Discovery Analyses

Two analyses are used here.

- analysis 1: compare wiki feed URLs against discovery feed URLs
- analysis 2: for URL mismatches, check whether both URLs still return the same feed

Inputs:

- wiki list: [`data/source_urls.json`](/home/denchik/projects/Hackerspace-news-rss-feed/data/source_urls.json)
- discovery list: [`data/discovery/discovered_hackerspace_feeds.json`](/home/denchik/projects/Hackerspace-news-rss-feed/data/discovery/discovered_hackerspace_feeds.json)

## Analysis 1

Run:

```bash
npm run analyze:wiki-discovery
```

Output:

- [`analysis/wiki_discovery_feed_url_comparison.json`](/home/denchik/projects/Hackerspace-news-rss-feed/analysis/wiki_discovery_feed_url_comparison.json)

How to read it:

- `matched`
  wiki and discovery have the same feed URL
- `unmatched`
  discovery found an XML feed for the same hackerspace, but the URL is different
- `noDiscoveredXmlFeed`
  discovery has an entry for this hackerspace, but no XML feed was confirmed
- `noDiscoveryEntry`
  this hackerspace is missing from the discovery result entirely

Important:

- this analysis does not fetch the network again
- `unmatched` means URL mismatch, not content mismatch
- matching is currently done by `hackerspaceName`

## Analysis 2

Run:

```bash
npm run analyze:wiki-discovery-unmatched
```

Help:

```bash
npm run analyze:wiki-discovery-unmatched -- --help
```

Output:

- [`analysis/wiki_discovery_unmatched_response_comparison.json`](/home/denchik/projects/Hackerspace-news-rss-feed/analysis/wiki_discovery_unmatched_response_comparison.json)

This analysis takes `unmatched` items from analysis 1, requests both URLs, and compares the actual responses.

How to read it:

- `summary.unmatchedPairs`
  how many URL mismatches were checked
- `sameFeedContent`
  different URLs, but they appear to be the same feed
- `differentFeedContent`
  both URLs return parseable XML feeds, but they look like different feeds
- `nonXmlOrUnparseableResponse`
  at least one side did not end up as a parseable XML feed in that run

Current `sameFeedContent` signals:

- same final URL after redirects
- same raw body
- same feed title plus overlapping item links

## Retry / Timeout

Default for analysis 2:

- three attempts
- `attemptTimeoutsMs = [1000, 2000, 3000]`
- `retryDelaysMs = [1000, 2000]`

`attemptTimeoutsMs`:

- how long each request attempt may run before abort

`retryDelaysMs`:

- how long to wait between attempts
- for 3 attempts there are only 2 retry delays, because delays exist only between attempts

## Practical Reading Order

1. Run analysis 1.
2. Look at `matched` first.
3. For `unmatched`, run analysis 2.
4. Treat:
   - `sameFeedContent` as “different URL, probably same feed”
   - `differentFeedContent` as “likely genuinely different feeds”
   - `nonXmlOrUnparseableResponse` as “retry or inspect manually”
