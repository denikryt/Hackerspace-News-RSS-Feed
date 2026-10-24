import { expect,it,vi } from 'vitest';
import { consumePageEntries,checkPageTextBudget } from '../../src/renderPageSink.js';
it('awaits one write before requesting the next generated page',async()=>{
 const seen=[];function* pages(){seen.push('generate1');yield ['a.json','1234'];seen.push('generate2');yield ['b.json','ok'];}
 const write=vi.fn(async(path,content)=>{seen.push(path);});
 const result=await consumePageEntries(pages(),{write,siteUrl:'https://example.test',artifactMaxBytes:10000});
 expect(seen.slice(0,4)).toEqual(['generate1','a.json','generate2','b.json']);expect(result.pageCount).toBe(4);expect(result.pages).toBeUndefined();
});
it('rejects duplicate/unsafe paths, oversized output and oversized input before rendering',async()=>{
 for(const entries of [[['../bad','x']],[['a','x'],['a','x']],[['a','12345']]])await expect(consumePageEntries(entries,{write:async()=>{},siteUrl:'https://example.test',artifactMaxBytes:4})).rejects.toThrow();
 expect(()=>checkPageTextBudget([{contentText:'12345'}],4)).toThrow('render_artifact_too_large');
});
