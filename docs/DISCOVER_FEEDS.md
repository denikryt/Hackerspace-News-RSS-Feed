# Discover Feeds

This document describes:

- `npm run discover:feeds`

This is the crawler that:

- loads the hackerspace website list from the wiki page;
- saves the page snapshot locally;
- visits each website;
- tries to discover an RSS or Atom endpoint;
- writes the discovery result to JSON.

## Run

```bash
npm run discover:feeds
```

## Inputs

Wiki page:

- `https://wiki.hackerspaces.org/List_of_Hacker_Spaces`

The crawler extracts hackerspace websites from that page and then probes those websites for feed endpoints.

## Outputs

Source page snapshot:

- [`data/discovery/list_of_hacker_spaces.html`](/home/denchik/projects/Hackerspace-news-rss-feed/data/discovery/list_of_hacker_spaces.html)

Discovery result:

- [`data/discovery/discovered_hackerspace_feeds.json`](/home/denchik/projects/Hackerspace-news-rss-feed/data/discovery/discovered_hackerspace_feeds.json)

## What It Tries

For each website:

1. fetch homepage
2. extract `<link rel="alternate">` feed URLs when present
3. try fallback feed paths
4. try limited `blog.` subdomain fallbacks

Known social hosts like `t.me` and `facebook.com` are skipped.

## Current Request Defaults

Global crawl pacing:

- request concurrency: `6`
- minimum delay between scheduled requests: `250ms`

Candidate endpoint probing for one site:

- 2 attempts per endpoint
- `attemptTimeoutsMs = [1000, 2000]`
- `retryDelaysMs = [2000]`
- `1000ms` pause between different candidate endpoints

That means:

- attempt 1: timeout `1000ms`
- wait `2000ms`
- attempt 2: timeout `2000ms`
- then move to the next candidate endpoint

## Result Meaning

The JSON result is grouped by `validationStatus`.

Main groups:

- `valid`
  XML feed found and parsed with items
- `empty`
  XML feed found and parsed, but no items
- `invalid`
  endpoint responded, but did not produce a usable XML feed
- `unreachable`
  endpoint was selected but could not be reached successfully
- `not_checked`
  skipped or otherwise not confirmed

Important:

- `feedUrl` is kept only for `valid` and `empty`
- `discoveryMethod` shows how the winning candidate was found
- the file is updated incrementally during the crawl

## Logs

The command prints progress logs like:

- source page fetch
- source snapshot written
- website rows extracted
- `starting site N/total`
- `completed site N/total: ... (status/validationStatus)`

## Notes

- this crawler is for discovery, not for building the site directly
- the build flow does not automatically consume this JSON yet
