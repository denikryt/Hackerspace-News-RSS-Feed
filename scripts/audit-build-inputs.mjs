// Reproducible offline measurement of the supplied production snapshot. The
// newspaper selects summary HTML, then content HTML, then summary/content text.
import { readFile, readdir, stat } from 'node:fs/promises';
const dataDir = process.argv[2] || 'data';
const payload = JSON.parse(await readFile(`${dataDir}/feeds_normalized.json`, 'utf8'));
const entities = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'",'&apos;':"'",'&nbsp;':' ','&#8217;':'’','&#8216;':'‘','&#8220;':'“','&#8221;':'”','&#8230;':'…'};
function effectiveText(item) {
 const html = item.summaryHtml || item.contentHtml;
 if (!html) return (item.summaryText || item.contentText || '').trim();
 return html.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().replace(/&[#\w]+;/g, entity => {
  if (entities[entity]) return entities[entity];
  const cp = entity.startsWith('&#x') ? parseInt(entity.slice(3,-1),16) : entity.startsWith('&#') ? parseInt(entity.slice(2,-1),10) : NaN;
  return Number.isInteger(cp) && cp >= 0 && cp <= 0x10ffff ? String.fromCodePoint(cp) : entity;
 });
}
const lengths=[];let empty=0, total=0;
for (const feed of payload.feeds || []) for (const item of feed.items || []) { total++;const length=Array.from(effectiveText(item)).length;if(length)lengths.push(length);else empty++; }
lengths.sort((a,b)=>a-b);
const mean=lengths.reduce((a,b)=>a+b,0)/lengths.length;
const median=lengths.length%2 ? lengths[(lengths.length-1)/2] : (lengths[lengths.length/2-1]+lengths[lengths.length/2])/2;
const L=Math.ceil(mean);
const calendar=JSON.parse(await readFile(`${dataDir}/calendar/events.json`,'utf8'));
const calendarSources=[];const forms=new Set();
for (const item of calendar.items || []) {
 const audit={url:item.url,snapshotFile:item.snapshotFile,status:'unknown'};
 try {
  const raw=await readFile(`${dataDir}/calendar/raw/${item.snapshotFile}`,'utf8');
  const lines=raw.replace(/\r?\n[ \t]/g,'').split(/\r?\n/);const counts={VEVENT:0,RRULE:0,RDATE:0,EXDATE:0,'RECURRENCE-ID':0};
  for(const line of lines){const key=line.split(':',1)[0].split(';',1)[0];if(line==='BEGIN:VEVENT')counts.VEVENT++;else if(key in counts){counts[key]++;if(key==='RRULE') forms.add(line.slice(line.indexOf(':')+1));}}
  Object.assign(audit,{status:'checked',bytes:Buffer.byteLength(raw),counts});
 } catch(error) { audit.error=error.code || 'unavailable'; }
 calendarSources.push(audit);
}
console.log(JSON.stringify({auditDate:'2026-10-24',snapshotGeneratedAt:payload.generatedAt,feeds:payload.feeds.length,totalItems:total,nonempty:lengths.length,empty,mean,median,P90:lengths[Math.ceil(lengths.length*.90)-1],P95:lengths[Math.ceil(lengths.length*.95)-1],L,truncatedCount:lengths.filter(n=>n>L).length,truncatedFraction:lengths.filter(n=>n>L).length/lengths.length,feedItemsMaximum:Math.max(...payload.feeds.map(f=>f.items?.length||0)),snapshotBytes:(await stat(`${dataDir}/feeds_normalized.json`)).size,calendarSources,rruleForms:[...forms].sort()},null,2));
