import { expect, it, vi } from 'vitest';
import { consumePageEntries, checkPageTextBudget } from '../../src/renderPageSink.js';

it('awaits one write before requesting the next generated page', async () => {
  const seen = [];
  function* pages() {
    seen.push('generate1'); yield ['a.json', '1234'];
    seen.push('generate2'); yield ['b.json', 'ok'];
  }
  const write = vi.fn(async path => { seen.push(path); });
  const result = await consumePageEntries(pages(), { write, siteUrl: 'https://example.test', artifactMaxBytes: 10000 });
  expect(seen.slice(0, 4)).toEqual(['generate1', 'a.json', 'generate2', 'b.json']);
  expect(result.pageCount).toBe(4); expect(result.pages).toBeUndefined();
});
it('rejects duplicate and unsafe paths before a writer receives them', async () => {
  for (const path of ['../bad', '/absolute', 'a/../b', 'a\\b', 'a\0b']) {
    const write = vi.fn();
    await expect(consumePageEntries([[path, 'ok']], { write, artifactMaxBytes: 10000 })).rejects.toMatchObject({ code: 'invalid_render_path' });
    expect(write).not.toHaveBeenCalled();
  }
  await expect(consumePageEntries([['a', 'x'], ['a', 'x']], { write: async () => {}, artifactMaxBytes: 10000 })).rejects.toMatchObject({ code: 'invalid_render_path' });
});
it('accepts the inclusive output/input budgets and rejects N+1 before writing/rendering', async () => {
  const write=vi.fn();
  const options={write,siteUrl:'https://example.test',artifactMaxBytes:1000};
  await consumePageEntries([['exact.json','x'.repeat(1000)]],options);
  expect(write.mock.calls[0]).toEqual(['exact.json','x'.repeat(1000)]);
  write.mockClear();
  await expect(consumePageEntries([['over.json','x'.repeat(1001)]],options)).rejects.toMatchObject({code:'render_artifact_too_large'});
  expect(write).not.toHaveBeenCalled();
  expect(checkPageTextBudget([{contentText:'1234'}],4)).toBe(4);
  expect(()=>checkPageTextBudget([{contentText:'12345'}],4)).toThrow('render_artifact_too_large');
});
