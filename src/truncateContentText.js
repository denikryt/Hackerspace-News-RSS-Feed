import { load } from 'cheerio';
import { RESOURCE_LIMITS } from './resourceLimits.js';
// Bound Unicode text without splitting surrogate pairs. HTML keeps a valid
// fragment tree; reserve space for tag-boundary whitespace used by Newspaper.
export function truncateContentText(value, limit = RESOURCE_LIMITS.textMaxCodePoints, { html = false } = {}) {
 if(typeof value!=='string')return value;
 if(!Number.isSafeInteger(limit)||limit<1)throw new TypeError('Invalid text limit');
 if(!html)return Array.from(value).slice(0,limit).join('');
 const $=load(value,{},false);
 if(Array.from($.root().text()).length<=limit && Array.from(value.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).length<=limit)return value;
 let remaining=limit;
 function visit(node){
  if(node.type==='text'){const chars=Array.from(node.data);node.data=chars.slice(0,Math.max(0,remaining)).join('');remaining-=Math.min(chars.length,Math.max(0,remaining));}
  else {for(const child of node.children||[])visit(child);}
 }
 visit($.root()[0]);
 const result=$.html();
 return result;
}
const TEXT_FIELDS=new Set(['content:encoded','content','summary','description','contentSnippet','contentText','summaryText','text']);
const HTML_FIELDS=new Set(['contentHtml','summaryHtml','html']);
// Traverse only content candidates and observed content, preserving all IDs,
// titles, authors, dates, URLs and source metadata. Never retain raw duplicates.
export function limitItemText(item, limit = RESOURCE_LIMITS.textMaxCodePoints){
 if(!item||typeof item!=='object')return item;
 const out={...item};
 for(const [key,value] of Object.entries(out)){
  if(typeof value==='string' && (TEXT_FIELDS.has(key)||HTML_FIELDS.has(key)))out[key]=truncateContentText(value,limit,{html:HTML_FIELDS.has(key)||(['content:encoded','content','summary','description'].includes(key)&&/<[a-z][^>]*>/i.test(value))});
  else if(key==='observed')out[key]=limitItemText(value,limit);
  else if(['contentCandidates','summaryCandidates'].includes(key)&&Array.isArray(value))out[key]=value.map(v=>limitItemText(v,limit));
 }
 return out;
}
export function limitFeedPayload(payload){
 return {...payload,feeds:(payload?.feeds||[]).map(feed=>({...feed,items:(feed.items||[]).map(item=>limitItemText(item))}))};
}
