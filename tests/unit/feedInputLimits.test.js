import { expect, it } from 'vitest';
import { limitParsedFeed } from '../../src/feedInputLimits.js';
import { RESOURCE_LIMITS } from '../../src/resourceLimits.js';
it('accepts 500 items, truncates long content without dropping neighbors, rejects 501', () => {
    const items = Array.from({ length: 500 }, (_, i) => ({ guid: String(i), content: '😀'.repeat(RESOURCE_LIMITS.textMaxCodePoints + 1) }));
    const limited = limitParsedFeed({ items });
    expect(limited.items).toHaveLength(500);
    expect(Array.from(limited.items[0].content)).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);
    expect(limited.items.at(-1).guid).toBe('499');
    expect(() => limitParsedFeed({ items: [...items, {}] })).toThrow('too_many_feed_items');
});
