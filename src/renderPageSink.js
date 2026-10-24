import { posix } from 'node:path';
import { injectCanonicalHref, pagePathToCanonicalUrl } from './canonical.js';
import { buildRobotsTxt,buildSitemapXml } from './sitemap.js';
import { RESOURCE_LIMITS } from './resourceLimits.js';
// Backpressure boundary: generate, check and await one artifact at a time.
// Only paths survive a disk write; the in-memory API deliberately retains HTML.
export async function consumePageEntries(entries,{write,siteUrl,artifactMaxBytes=RESOURCE_LIMITS.artifactMaxBytes}={}){
 const paths=[];const seen=new Set();const pages=write?undefined:{};
 async function emit(path,content){
  if(typeof path!=='string'||!path||path.includes('\\')||posix.isAbsolute(path)||posix.normalize(path)!==path||path.split('/').some(p=>p==='..'||p==='.')||seen.has(path))throw Object.assign(new Error('invalid_render_path'),{code:'invalid_render_path'});
  const output=injectCanonicalHref(content,pagePathToCanonicalUrl(path,siteUrl));
  if(Buffer.byteLength(output)>artifactMaxBytes)throw tooLarge();
  seen.add(path);paths.push(path);if(write)await write(path,output);else Object.defineProperty(pages,path,{value:output,enumerable:true,configurable:true});
 }
 for await(const [path,content] of entries)await emit(path,content);
 await emit('sitemap.xml',buildSitemapXml(paths,siteUrl));await emit('robots.txt',buildRobotsTxt(siteUrl));
 return {pageCount:paths.length,...(pages?{pages}:{})};
}
// Check the whole day's input before building column models and HTML strings.
export function checkPageTextBudget(items,maxBytes=RESOURCE_LIMITS.pageTextMaxBytes){
 let bytes=0;
 for(const item of items)for(const key of ['title','contentHtml','contentText','summaryHtml','summaryText','spaceName','resolvedAuthor'])if(typeof item[key]==='string'){
  bytes+=Buffer.byteLength(item[key]);if(bytes>maxBytes)throw tooLarge();
 }
 return bytes;
}
function tooLarge(){return Object.assign(new Error('render_artifact_too_large'),{code:'render_artifact_too_large'});}
