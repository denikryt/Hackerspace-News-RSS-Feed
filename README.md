# Hackerspace News

[Hackerspace News](https://hackerspace.news/) is a static website that brings together publications and events from hackerspaces. It collects posts from RSS feeds and events from ICS calendars, making updates from different communities easier to follow in one place.

## How it works

The initial sources come from [wiki.hackerspaces.org](https://wiki.hackerspaces.org/). Discovery can find hackerspace websites and their feeds and add them to the RSS registry. The registries are also open to manual contributions, so a hackerspace does not need a wiki listing to be added.

During a site update, the aggregator fetches data from the configured sources and renders static pages. Readers can browse hackerspaces and their publications, daily news, an events calendar, curated articles, and author pages.

## Add your source

Open a pull request adding an entry to the `items` array in the appropriate registry:

| What to add | Registry | Entry fields |
| --- | --- | --- |
| A hackerspace RSS feed | [content/rss_feeds.json](content/rss_feeds.json) | `hackerspaceName`, `country`, `website`, `feedUrl`; optional `hackerspaceWikiUrl` |
| An ICS event calendar | [content/ics_events.json](content/ics_events.json) | `url`; optional `hs_name` and `country` |
| An individual publication for Curated | [content/curated_publications.json](content/curated_publications.json) | `feedUrl` and `guid` |

Curated publications can come from hackerspace websites or independent authors writing about hackerspaces. The publication must be available through a feed; `guid` is its exact item ID in that feed.

Accepted additions become available when the updated registries are included in the next site build.
