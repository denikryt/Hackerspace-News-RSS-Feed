// Small fixed-size synthetic experiment; each mode must run in a fresh PID.
import { buildCalendarIndex, toVisibleDayEvent } from '../src/calendar/buildCalendarIndex.js';
const mode=process.argv[2]||'refs';const count=Number(process.argv[3]||8);
if(!['refs','full'].includes(mode)||![8,32].includes(count))throw new Error('Use refs|full and 8|32');
const events=Array.from({length:count},(_,i)=>({uid:`source-${i}`,sourceFile:`source-${i}.ics`,summary:`Event ${i}`,dateKind:'date',sourceDate:'2025-01-01',endSourceDateExclusive:'2028-01-01',description:'x'.repeat(1024)}));
const index=buildCalendarIndex(events,{windowYear:2026});let output=index;
let references=0;
if(mode==='full'){
 output={months:Object.fromEntries(Object.entries(index.months).map(([month,m])=>[month,{...m,dates:Object.fromEntries(Object.entries(m.dates).map(([day,bucket])=>[day,{dateKey:day,dateLabel:bucket.dateLabel,events:bucket.eventIndexes.map(ref=>{const {_sortKey,...event}=toVisibleDayEvent(events[ref],'UTC',day);return event;})}]))}]))};
}
for(const month of Object.values(index.months))for(const bucket of Object.values(month.dates))references+=bucket.eventIndexes.length;
const json=JSON.stringify(output);
console.log(JSON.stringify({synthetic:true,mode,events:count,references,jsonBytes:Buffer.byteLength(json),descriptionCopies:(json.match(/"description":/g)||[]).length,peakRssMiB:process.resourceUsage().maxRSS/1024}));
