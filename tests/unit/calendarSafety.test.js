import { expect, it } from 'vitest';
import { normalizeCalendarSnapshot } from '../../src/calendar/normalizeCalendarSnapshot.js';
import { buildCalendarIndex, isCalendarIndexValid } from '../../src/calendar/buildCalendarIndex.js';
import { parseCalendarIcsText } from '../../src/calendar/readCalendarEvents.js';
const options={windowYear:2026};
it('repairs old dates before clipping and drops only nested event arrays',()=>{
 const e={dateKind:'date',start:'20271231',end:'20280102',sourceDate:'2028-01-02',description:'abcd'};
 const p=normalizeCalendarSnapshot({events:[e],items:[{url:'x',eventCount:9,events:[e]}]}, {textLimit:3});
 expect(p.events[0]).toMatchObject({sourceDate:'2027-12-31',endSourceDateExclusive:'2028-01-02',description:'abc'});expect(p.items).toEqual([{url:'x',eventCount:9}]);
 const index=buildCalendarIndex(p.events,options);expect(index.months['2027-12'].dates['2027-12-31'].eventIndexes).toEqual([0]);expect(index.months['2028-01']).toBeUndefined();
 expect(isCalendarIndexValid(index,p.events,options)).toBe(true);expect(isCalendarIndexValid(index,[{...p.events[0],summary:'edit'}],options)).toBe(false);
});
it('preserves identical independent events and stores only numeric refs',()=>{
 const event={dateKind:'date',sourceDate:'2025-01-01',endSourceDateExclusive:'2028-01-01',description:'x'.repeat(1024)};
 const events=normalizeCalendarSnapshot({events:[event,{...event}]}).events;const index=buildCalendarIndex(events,options);
 expect(index.months['2025-01'].dates['2025-01-01'].eventIndexes).toEqual([0,1]);expect(JSON.stringify(index)).not.toContain('description');
 index.months['2025-01'].dates['2025-01-01'].eventIndexes.push(-1);expect(isCalendarIndexValid(index,events,options)).toBe(false);
});
it('parses exclusive date-only end, default one day and rejects invalid intervals',()=>{
 const events=parseCalendarIcsText('BEGIN:VCALENDAR\nBEGIN:VEVENT\nDTSTART;VALUE=DATE:20260101\nDTEND;VALUE=DATE:20260102\nEND:VEVENT\nEND:VCALENDAR',{sourceFile:'test.ics'});
 expect(events[0]).toMatchObject({sourceDate:'2026-01-01',endSourceDateExclusive:'2026-01-02'});
 expect(normalizeCalendarSnapshot({events:[{dateKind:'date',start:'20260230'}]}).events).toEqual([]);
});
