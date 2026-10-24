// Preserve source order while keeping at most concurrency operations alive.
// Await every worker even after failure so callers can safely clean staging.
export async function mapWithConcurrency(items,concurrency,mapper){
 const results=new Array(items.length);let next=0;let failure;
 const workers=Array.from({length:Math.min(concurrency,items.length)},async()=>{
  while(next<items.length&&!failure){const index=next++;try{results[index]=await mapper(items[index],index);}catch(error){failure=error;}}
 });
 await Promise.all(workers);if(failure)throw failure;return results;
}
