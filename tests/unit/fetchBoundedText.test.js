import { expect, it, vi } from 'vitest';
import { fetchBoundedText } from '../../src/http/fetchBoundedText.js';
const read=(body,options={})=>fetchBoundedText({url:'https://example.test',timeoutMs:100,maxBodyBytes:4,fetchImpl:async()=>new Response(body),...options});
it('accepts exactly N bytes and counts split UTF8 bytes independently of headers',async()=>{
 expect(await read('😀')).toMatchObject({text:'😀',bytesRead:4});
 await expect(read('😀x')).rejects.toMatchObject({code:'response_too_large'});
 const stream=new ReadableStream({start(c){c.enqueue(new Uint8Array([0xf0,0x9f]));c.enqueue(new Uint8Array([0x98,0x80]));c.close();}});
 expect((await read(stream)).text).toBe('😀');
 await expect(read('12345',{fetchImpl:async()=>new Response('12345',{headers:{'content-length':'1'}})})).rejects.toMatchObject({code:'response_too_large'});
});
it('enforces the deadline through stalled body and cancels it',async()=>{
 const cancel=vi.fn();await expect(read(new ReadableStream({cancel}),{timeoutMs:10})).rejects.toMatchObject({code:'timeout',name:'AbortError'});expect(cancel).toHaveBeenCalled();
});
it('aborts fetch implementations which ignore signals and supports external cancellation',async()=>{
 await expect(read(null,{fetchImpl:()=>new Promise(()=>{}),timeoutMs:10})).rejects.toMatchObject({code:'timeout'});
 const c=new AbortController();c.abort();await expect(read('x',{signal:c.signal})).rejects.toMatchObject({code:'timeout'});
});
it('rejects invalid streams without a text-only compatibility reader and cancels header oversize',async()=>{
 await expect(read(null,{fetchImpl:async()=>({ok:true,headers:new Headers(),text:async()=>''})})).rejects.toMatchObject({code:'invalid_stream'});
 const cancel=vi.fn();await expect(read(null,{fetchImpl:async()=>new Response(new ReadableStream({cancel}),{headers:{'content-length':'5'}})})).rejects.toMatchObject({code:'response_too_large'});expect(cancel).toHaveBeenCalled();
 expect(await read('bad',{fetchImpl:async()=>new Response('bad',{status:404})})).toMatchObject({ok:false,status:404,text:'bad'});
});
