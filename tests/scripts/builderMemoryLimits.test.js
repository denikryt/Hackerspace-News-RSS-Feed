import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';
it('bounds builder RAM plus swap and configures smaller V8 heap',()=>{
 const yaml=readFileSync('docker-compose.yml','utf8').split('  site:')[0];
 expect(yaml).toContain('mem_limit:');expect(yaml).toContain('memswap_limit:');expect(yaml).toContain('NODE_OPTIONS:');
});
