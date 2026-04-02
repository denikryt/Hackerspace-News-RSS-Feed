# Hackerspace News RSS Feed

Static website that aggregates RSS publications from hackerspaces listed on the hackerspaces wiki.

The project fetches the source list from the `Spaces with RSS feeds` section on:

- `https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds`

The repository also contains additional already-confirmed valid source rows in:

- `content/discovered_valid_source_urls.json`

It validates candidate feed URLs, parses supported feeds, normalizes the data into local JSON snapshots, and renders a static multi-page site with:

- spaces index
- per-space detail pages
- global feed pages sorted by date descending

## Requirements

- Node.js
- npm

## Local Run

Install dependencies:

```bash
npm install
```

Fetch data and build the site:

```bash
npm run build
```

This is the simplest local run and is enough to build the site from the main wiki RSS source list.

If you also want to include the checked-in additional valid sources from `content/discovered_valid_source_urls.json`, run:

```bash
npm run build -- --include-discovery-valid
```

Start the local HTTP server:

```bash
npm start
```

The local server serves the generated `dist/` directory on port `8090` by default.

Open:

```text
http://127.0.0.1:8090
```

## Build Pipeline

The project is split into three commands:

- `npm run refresh` updates local data snapshots in `data/`
- `npm run render` rebuilds `dist/` from existing local JSON
- `npm run build` runs `refresh` and then `render`
- `npm run refresh -- --include-discovery-valid` or `npm run build -- --include-discovery-valid` also merge in the checked-in additional valid sources from `content/discovered_valid_source_urls.json`

Use `npm run render` when you changed only UI or rendering logic and do not need to refresh network data.

## Discovery

Discovery is a separate flow based on the broader hackerspace website directory.

Main commands:

```bash
npm run discover:feeds
npm run discover:valid-sources
```

The clean valid-source artifact written by this flow is:

- `content/discovered_valid_source_urls.json`

It can be merged into `refresh` or `build` with:

```bash
npm run build -- --include-discovery-valid
npm run refresh -- --include-discovery-valid
```

Detailed discovery flow documentation:

- [docs/DISCOVER_FEEDS.md](/home/denchik/projects/Hackerspace-news-rss-feed/docs/DISCOVER_FEEDS.md)
- [docs/WIKI_DISCOVERY_ANALYSES.md](/home/denchik/projects/Hackerspace-news-rss-feed/docs/WIKI_DISCOVERY_ANALYSES.md)

## Production Deployment

This project is intended to be served as static files behind `nginx`.

The production flow was tested on Ubuntu 24.04.

Typical setup:

1. Point your domain to the server with DNS records.
2. Configure `nginx` to serve a directory from `/var/www/...`.
3. Build or render the site so that `dist/` contains the current static output.
4. Copy `dist/` into the directory used by `nginx`.
5. Reload `nginx`.

## Deploy Script

The repository includes:

- [scripts/deploy-site.sh](/home/denchik/projects/Hackerspace-news-rss-feed/scripts/deploy-site.sh)

This script supports three modes:

- default mode: copies the current `dist/` to `TARGET_DIR` and reloads `nginx`
- `render` mode: runs `npm run render`, then copies `dist/` to `TARGET_DIR`, then reloads `nginx`
- `build` mode: runs `npm run build`, then copies `dist/` to `TARGET_DIR`, then reloads `nginx`

It does not run `npm install`.

Current target directory defaults to:

```bash
/var/www/hackerspace.news
```

You can change it in the script or override it through the environment:

```bash
TARGET_DIR="/var/www/your-site" ./scripts/deploy-site.sh
```

Typical manual deployment with existing already-built `dist/`:

```bash
./scripts/deploy-site.sh
```

Typical manual deployment after re-rendering from existing local data snapshots:

```bash
./scripts/deploy-site.sh render
```

Typical manual deployment with fresh data refresh and full rebuild:

```bash
./scripts/deploy-site.sh build
```

## systemd Timer

The repository also includes scripts for installing and removing a `systemd` timer that runs deployment every hour:

- [scripts/install-deploy-site-timer.sh](/home/denchik/projects/Hackerspace-news-rss-feed/scripts/install-deploy-site-timer.sh)
- [scripts/uninstall-deploy-site-timer.sh](/home/denchik/projects/Hackerspace-news-rss-feed/scripts/uninstall-deploy-site-timer.sh)

Install:

```bash
./scripts/install-deploy-site-timer.sh
```

Remove:

```bash
./scripts/uninstall-deploy-site-timer.sh
```

By default, the timer runs once per hour. It executes `./scripts/deploy-site.sh build`, refreshes data from the network, rebuilds the static site, copies `dist/` to the target directory, and reloads `nginx`.

The installer creates a `systemd` service and timer for the current project path and configures the service to run `./scripts/deploy-site.sh build`. That means each timer run refreshes data, rebuilds the site, copies `dist/` to the target directory, and reloads `nginx`. The installer also starts the deploy service once immediately to verify that deployment works.

## Data Source and Behavior

Source of truth:

- `https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds`

Optional additional source rows:

- `content/discovered_valid_source_urls.json`

Behavioral notes:

- normalized JSON in `data/` is the local data layer
- rendering reads only the data that actually exists
- missing fields are omitted from the UI
- feed parsing accounts for RSS, Atom, RDF, missing fields, empty feeds, and non-feed URLs

## Project Structure

- `src/refreshDataset.js` handles ingestion and data snapshot generation
- `src/renderSite.js` renders static pages from local JSON
- `src/cli/refresh.js` runs refresh only
- `src/cli/render.js` runs render only
- `src/cli/build.js` runs the full pipeline

## Testing

Run the test suite:

```bash
npm test
```
