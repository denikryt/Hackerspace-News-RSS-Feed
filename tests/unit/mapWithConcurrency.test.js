import { expect, it } from "vitest";
import { mapWithConcurrency } from "../../src/mapWithConcurrency.js";
it("bounds active work, preserves source order and drains workers before propagating failure", async () => {
 let active=0;let peak=0;
 const mapped=await mapWithConcurrency([0,1,2,3,4],2,async value=>{
  active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,3));active--;return value*2;
 });
 expect(peak).toBe(2);expect(mapped).toEqual([0,2,4,6,8]);
 let drained=false;
 await expect(mapWithConcurrency([0,1,2],2,async value=>{
  if(value===0){await new Promise(resolve=>setTimeout(resolve,1));throw new Error('disk failure');}
  await new Promise(resolve=>setTimeout(resolve,5));drained=true;
 })).rejects.toThrow('disk failure');
 expect(drained).toBe(true);
});
