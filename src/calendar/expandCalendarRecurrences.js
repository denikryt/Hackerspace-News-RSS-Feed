import ICAL from 'ical.js';
import { calendarYearWindow } from './normalizeCalendarSnapshot.js';
// Expansion is conditional on observed recurrence properties. ICAL.js owns
// RFC rule arithmetic; this adapter owns source identity and bounded output.
export function expandCalendarRecurrences(text,{windowYear,parseComponent}){
 const calendar=new ICAL.Component(ICAL.parse(text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/).filter(line => line.includes(":" )).join("\r\n")));
 const components=calendar.getAllSubcomponents('vevent');
 const window=calendarYearWindow(windowYear);const output=[];
 const exceptions=components.filter(c=>c.hasProperty('recurrence-id'));
 const emittedExceptions=new Set();
 for(const component of components){
  if(component.hasProperty('recurrence-id'))continue;
  if(!component.hasProperty('dtstart'))continue;
  const master=new ICAL.Event(component);
  if(!master.isRecurring()){const value=parseComponent(component.toString());if(value)output.push(value);continue;}
  assertSupported(component);
  const related=exceptions.filter(c=>c.getFirstPropertyValue('uid')===master.uid);
  for(const exception of related){assertSupported(exception);master.relateException(new ICAL.Event(exception));}
  const iterator=master.iterator();let occurrence;
  // Pre-window timestamps are iterated but never collected as event objects.
  // Observed rules are daily or coarser, so no sub-daily fanout is accepted.
  while((occurrence=iterator.next())){
   if(occurrence.toString().slice(0,10)>=window.windowEndExclusive)break;
   const details=master.getOccurrenceDetails(occurrence);
   const endKey=details.endDate.toString().slice(0,10);
   if(endKey<window.windowStart)continue;
   const actual=details.item.component;
   if(actual.hasProperty('recurrence-id'))emittedExceptions.add(actual);
   if(actual.getFirstPropertyValue('status')==='CANCELLED')continue;
   const clone=new ICAL.Component(structuredClone(actual.toJSON()));
   clone.updatePropertyWithValue('dtstart',details.startDate);
   clone.updatePropertyWithValue('dtend',details.endDate);
   const value=parseComponent(clone.toString());
   if(value&&intersects(value,window))output.push({...value,recurrenceId:occurrence.toICALString()});
  }
 }
 // Detached overrides can move from an out-of-window recurrence ID into the
 // window. Preserve those even when the master's iteration did not visit them.
 for(const exception of exceptions){
  if(emittedExceptions.has(exception)||exception.getFirstPropertyValue('status')==='CANCELLED')continue;
  const value=parseComponent(exception.toString());
  if(value&&intersects(value,window))output.push({...value,recurrenceId:exception.getFirstPropertyValue('recurrence-id').toICALString()});
 }
 return output;
}
function intersects(event,window){
 const start=event.dateKind==='date'?event.sourceDate:event.startInstant?.slice(0,10);
 const end=event.dateKind==='date'?event.endSourceDateExclusive:(event.endInstant||event.startInstant)?.slice(0,10);
 return start<window.windowEndExclusive&&(event.dateKind==='date'?end>window.windowStart:end>=window.windowStart);
}
// Unknown semantics must fail visibly, rather than masquerade as one VEVENT.
function assertSupported(component){
 const allowed=new Set(['FREQ','BYMONTH','BYDAY','UNTIL','WKST','COUNT','INTERVAL','BYSETPOS','BYMONTHDAY']);
 for(const rule of component.getAllProperties('rrule')){
  const value=rule.getFirstValue().toString();
  if(value.split(';').some(part => /^(COUNT|INTERVAL)=/.test(part) && !(Number(part.split('=')[1]) > 0))) throw unsupported();
  if(!/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)(;|$)/.test(value)||value.split(';').some(p=>!allowed.has(p.split('=')[0])))throw unsupported();
 }
 for(const property of component.getAllProperties('rdate'))if(property.type==='period')throw unsupported();
 if(component.getFirstProperty('recurrence-id')?.getParameter('range'))throw unsupported();
}
function unsupported(){return Object.assign(new Error('unsupported_calendar_recurrence'),{code:'unsupported_calendar_recurrence'});}
