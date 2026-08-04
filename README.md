# Hackerspace News RSS Feed

Static website that aggregates RSS publications from hackerspaces listed on the hackerspaces wiki.

The project fetches the source list from the `Spaces with RSS feeds` section on:

- `https://wiki.hackerspaces.org/User%3AJomat#Spaces_with_RSS_feeds`

The repository also contains additional already-confirmed valid source rows in:

- `content/discovered_valid_source_urls.json`

It validates candidate feed URLs, parses supported feeds, normalizes the data into local JSON snapshots, and renders a static multi-page site with:

- spaces index
- per-space detail pages
- per-day newspaper pages under `/news/`

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

Production uses two nginx layers:

- host `nginx` keeps TLS certificates, public ports, redirects, access logs, and probe blocking;
- Docker `site` nginx serves only the generated static files from a read-only Docker volume on `127.0.0.1:18088`.

The generated site is no longer copied to `/var/www/hackerspace.news`.

First publish the Docker site volume and start the local web container:

```bash
./scripts/deploy-site.sh build --include-discovery-valid
```

Then install the host nginx reverse proxy config:

```bash
sudo ./scripts/install-nginx-container-proxy.sh
```

The installed nginx config is based on:

- `deploy/nginx/hackerspace.news.container.conf`

It proxies `https://hackerspace.news/` to `http://127.0.0.1:18088/`.

## Deploy Script

The repository includes:

- [scripts/deploy-site.sh](/home/denchik/projects/deploy/hackerspace-news-rss-feed/scripts/deploy-site.sh)

The script publishes through Docker Compose:

- builds the `site-builder` and `site` images;
- runs `site-builder` as a one-shot container;
- writes the generated static files into the `site-html` Docker volume;
- starts the `site` nginx container;
- verifies `index.html` and `favicon.png` inside the running container.

Supported modes:

- default mode: same as `build`;
- `build`: runs `npm run build` inside `site-builder` and publishes the result;
- `render`: runs `npm run render` inside `site-builder` and publishes the result.

Typical full deployment:

```bash
./scripts/deploy-site.sh build --include-discovery-valid
```

Fast deployment after rendering-only changes:

```bash
./scripts/deploy-site.sh render
```

Check the local container endpoint:

```bash
curl -I http://127.0.0.1:18088/
docker compose ps
```

## systemd Timer

The repository includes scripts for installing and removing the hourly Docker deployment timer:

- [scripts/install-deploy-site-timer.sh](/home/denchik/projects/deploy/hackerspace-news-rss-feed/scripts/install-deploy-site-timer.sh)
- [scripts/uninstall-deploy-site-timer.sh](/home/denchik/projects/deploy/hackerspace-news-rss-feed/scripts/uninstall-deploy-site-timer.sh)

Install the container timer:

```bash
sudo ./scripts/install-deploy-site-timer.sh --include-discovery-valid
```

Remove the container timer and any legacy host-copy timer:

```bash
sudo ./scripts/uninstall-deploy-site-timer.sh
```

The installer removes the old `hackerspace-news-feed-deploy.service` and `hackerspace-news-feed-deploy.timer` units, then creates:

- `hackerspace-news-feed-container-deploy.service`
- `hackerspace-news-feed-container-deploy.timer`

The timer runs once per hour and executes `./scripts/deploy-site.sh build` from the current checkout path.

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
