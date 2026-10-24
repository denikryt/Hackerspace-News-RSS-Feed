import { describe, expect, it, vi } from 'vitest';
import { readResourceLimits } from '../../src/resourceLimits.js';
import { createMemoryDiagnostics } from '../../src/memoryDiagnostics.js';
describe('resource policy', () => {
 it('accepts positive inclusive byte limits and rejects malformed or unsafe memory configuration', () => {
  expect(readResourceLimits({ FEED_MAX_BODY_BYTES:'7' }).feedMaxBodyBytes).toBe(7);
  for (const value of ['0','-1','1.5','nan','Infinity','1x']) expect(()=>readResourceLimits({FEED_MAX_BODY_BYTES:value})).toThrow();
  expect(()=>readResourceLimits({BUILDER_MEMORY_MIB:'768',NODE_OLD_SPACE_MIB:'768'})).toThrow();
  expect(()=>readResourceLimits({NODE_OPTIONS:'--max-old-space-size=1024'})).toThrow();
 });
 it('logs only whitelisted numeric counters, with injectable RSS', () => {
  const logger=vi.fn(); const checkpoint=createMemoryDiagnostics({enabled:true,logger,memoryUsage:()=>({rss:1048576,heapUsed:524288,external:0,arrayBuffers:0})});
  checkpoint('render',{pagesWritten:2,body:'private',failures:0});
  expect(JSON.parse(logger.mock.calls[0][0])).toMatchObject({stage:'render',rssMiB:1,pagesWritten:2});
  expect(logger.mock.calls[0][0]).not.toContain('private');
 });
 it('does not fabricate RSS when OS metrics are unavailable',()=>{
  const logger=vi.fn();createMemoryDiagnostics({enabled:true,logger,memoryUsage:()=>{throw Object.assign(new Error(),{code:'ENOENT'});}})('refresh');
  expect(JSON.parse(logger.mock.calls[0][0])).toMatchObject({rssMiB:null,memoryError:'ENOENT'});
 });
});
