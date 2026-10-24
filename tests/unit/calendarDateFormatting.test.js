import { expect,it } from 'vitest';
import { formatDateKeyInTimeZone,formatTimeLabel,getCalendarFormatter } from '../../src/calendar/dateFormatting.js';
it('reuses formatters without changing UTC, DST or year-boundary results',()=>{
 for(const [instant,zone,date,time] of [
  ['2026-03-29T00:30:00Z','Europe/Berlin','2026-03-29','1:30 AM'],
  ['2026-03-29T01:30:00Z','Europe/Berlin','2026-03-29','3:30 AM'],
  ['2026-12-31T23:30:00Z','Asia/Tokyo','2027-01-01','8:30 AM'],
 ]){expect(formatDateKeyInTimeZone(instant,zone)).toBe(date);expect(formatTimeLabel(new Date(instant),zone)).toBe(time);}
 const options={timeZone:'UTC',year:'numeric'};expect(getCalendarFormatter(options)).toBe(getCalendarFormatter(options));
});
