import { truncateContentText } from '../truncateContentText.js';
import { RESOURCE_LIMITS } from '../resourceLimits.js';
const DAY=86400000;
// Raw DTSTART/DTEND are authoritative for both new and historical snapshots.
// Date-only end is exclusive; timed semantics belong to the existing parser.
export function normalizeDateOnlyInterval(event){
 if(event.dateKind!=='date')return event;
 const sourceDate=event.start ? dateKey(event.start) : dateKey(event.sourceDate);
 if(!sourceDate)return null;
 const endSourceDateExclusive=event.end ? dateKey(event.end) : event.endSourceDateExclusive ? dateKey(event.endSourceDateExclusive) : new Date(Date.parse(sourceDate)+DAY).toISOString().slice(0,10);
 if(!endSourceDateExclusive||endSourceDateExclusive<=sourceDate)return null;
 return {...event,sourceDate,endSourceDateExclusive};
}
function dateKey(value){
 if(typeof value!=='string')return null;
 const key=/^\d{8}$/.test(value)?`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}`:value;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(key))return null;
 const time=Date.parse(key);return Number.isFinite(time)&&new Date(time).toISOString().slice(0,10)===key?key:null;
}
export function calendarYearWindow(windowYear = new Date().getUTCFullYear()){
 return {windowYear,windowStart:`${windowYear-1}-01-01`,windowEndExclusive:`${windowYear+2}-01-01`};
}
// Canonical events are retained locally; public projection is independently
// filtered. Source items are metadata only, including their original counts.
export function normalizeCalendarSnapshot(payload,{textLimit=RESOURCE_LIMITS.textMaxCodePoints}={}){
 let skippedEvents=0;
 const events=(payload?.events||[]).flatMap(event=>{
  const normalized=normalizeDateOnlyInterval(event);
  if(!normalized){skippedEvents++;return [];}
  return [{...normalized,description:truncateContentText(normalized.description,textLimit)}];
 });
 const items=(payload?.items||[]).map(item=>{const {events,rawIcsText,...metadata}=item;return {...metadata,...(metadata.eventCount===undefined&&Array.isArray(events)?{eventCount:events.length}:{})};});
 return {...payload,items,events,...(skippedEvents?{summary:{...payload?.summary,skippedEvents}}:{})};
}
export function publicCalendarPayload(payload,window){
 return {...payload,...window,events:payload.events.filter(event=>{
  const start=event.dateKind==='date'?event.sourceDate:event.startInstant?.slice(0,10);
  const end=event.dateKind==='date'?event.endSourceDateExclusive:(event.endInstant||event.startInstant)?.slice(0,10);
  return start&&end&&start<window.windowEndExclusive&&(event.dateKind==='date'?end>window.windowStart:end>=window.windowStart);
 })};
}
