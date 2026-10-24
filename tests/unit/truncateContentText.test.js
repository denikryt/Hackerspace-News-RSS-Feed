import { expect, it } from 'vitest';
import { truncateContentText, limitItemText } from '../../src/truncateContentText.js';
import { load } from 'cheerio';
it('counts Unicode code points and preserves valid HTML nesting idempotently', () => {
    expect(truncateContentText('😀abc', 3)).toBe('😀ab');
    const html = truncateContentText('<p>😀a<strong>bc</strong>d</p>', 3, { html: true });
    expect(load(html).text()).toBe('😀ab');
    expect(html).toContain('</strong>');
    expect(truncateContentText(html, 3, { html: true })).toBe(html);
    expect(truncateContentText('<b>short</b>', 8, { html: true })).toBe('<b>short</b>');
});
it('limits normalized, parsed and observed variants without removing metadata', () => {
    const item = { id: 'keep', description: '😀abcd', contentHtml: '<p>abcd</p>', observed: { contentCandidates: [{ html: '<p>abcd</p>', text: 'abcd' }] } };
    const limited = limitItemText(item, 3);
    expect(limited.id).toBe('keep');
    expect(limited.description).toBe('😀ab');
    expect(limited.observed.contentCandidates[0].text).toBe('abc');
    expect(item.description).toBe('😀abcd');
});
