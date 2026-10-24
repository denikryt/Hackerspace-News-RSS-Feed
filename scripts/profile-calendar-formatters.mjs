// Separate processes make maxRSS comparable; no fabricated process RSS values.
import { createHash } from 'node:crypto';
import { formatLongDateLabel } from '../src/calendar/dateFormatting.js';
const cached=process.argv[2]==='cached';const hash=createHash('sha256');
for(let i=0;i<2000;i++){
 const key=new Date(Date.UTC(2025,0,1+i%1095)).toISOString().slice(0,10);
 const result=cached?formatLongDateLabel(key,'UTC'):new Intl.DateTimeFormat('en-US',{timeZone:'UTC',weekday:'long',month:'long',day:'numeric',year:'numeric'}).format(new Date(`${key}T00:00:00.000Z`));hash.update(result);
}
console.log(JSON.stringify({synthetic:true,cached,formattedDates:2000,sha256:hash.digest('hex'),peakRssMiB:process.resourceUsage().maxRSS/1024}));
