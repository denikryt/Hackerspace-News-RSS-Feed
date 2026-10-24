import { RESOURCE_LIMITS } from './resourceLimits.js';
import { limitItemText } from './truncateContentText.js';
// Item count is a feed-level error; long item content is normal truncation.
export function limitParsedFeed(feed) {
 if((feed.items?.length||0)>RESOURCE_LIMITS.maxFeedItems)throw Object.assign(new Error('too_many_feed_items'),{code:'too_many_feed_items'});
 return {...feed,items:(feed.items||[]).map(item=>limitItemText(item))};
}
