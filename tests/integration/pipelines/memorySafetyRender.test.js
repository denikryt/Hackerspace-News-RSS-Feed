import { expect,it } from 'vitest';
import { load } from 'cheerio';
import { renderSite } from '../../../src/renderSite.js';
import { RESOURCE_LIMITS } from '../../../src/resourceLimits.js';
export function legacyInputs(){
 const event={uid:'keep',summary:'Boundary event',dateKind:'date',start:'20271231',end:'20280102',sourceDate:'2028-01-02',description:'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints+1)};
 return {now:Date.parse('2026-05-17T12:00:00Z'),sourceRowsPayload:{urls:[]},validationsPayload:[],normalizedPayload:{summary:{sourceRows:1,validFeeds:1,parsedFeeds:1,emptyFeeds:0,failedFeeds:0},feeds:[{id:'space',spaceName:'Real Shape',country:'Germany',items:[{id:'keep',title:'Post',link:'https://example.test/post',displayDate:'2026-05-16T10:00:00.000Z',summaryText:'x'.repeat(RESOURCE_LIMITS.textMaxCodePoints+1)}]}],failures:[]},calendarPayload:{events:[event],items:[{url:'https://example.test/calendar',eventCount:8,events:[event]}]},calendarIndexPayload:{months:{},availableMonthsWithEvents:[]}};
}
it('offline render repairs a legacy snapshot, bounds text and does not mutate source data',async()=>{
 const input=legacyInputs();const before=JSON.stringify(input);const result=await renderSite(input);
 const publicCalendar=JSON.parse(result.pages['calendar/events.json']);
 expect(publicCalendar.events).toHaveLength(1);expect(publicCalendar.events[0]).toMatchObject({sourceDate:'2027-12-31',endSourceDateExclusive:'2028-01-02'});
 expect(Array.from(publicCalendar.events[0].description)).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);expect(publicCalendar.items).toEqual([{url:'https://example.test/calendar',eventCount:8}]);
 expect(Object.keys(result.pages).some(p=>p.startsWith('calendar/2028-'))).toBe(false);expect(result.pages['calendar/2027-12/index.html']).toContain('Boundary event');
 expect(Array.from(load(result.pages['news/2026-05-16/index.html'])('.np-item-body').text())).toHaveLength(RESOURCE_LIMITS.textMaxCodePoints);
 expect(result.normalizedPayload.feeds[0].items[0].id).toBe('keep');expect(JSON.stringify(input)).toBe(before);
 const second=await renderSite({...input,normalizedPayload:result.normalizedPayload,calendarPayload:result.calendarPayload,calendarIndexPayload:result.calendarIndexPayload});expect(second.pages).toEqual(result.pages);
});
